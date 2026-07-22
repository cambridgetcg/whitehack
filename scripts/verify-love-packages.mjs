#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  constants as fsConstants,
} from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PACKAGE_NAME = "whitehack";
const SOURCE_REPOSITORY = "https://github.com/cambridgetcg/whitehack.git";
const EXPECTED_NPM_VERSION = "11.17.0";
const MAX_JSON_BYTES = 128 * 1024;
const MAX_ARTIFACT_BYTES = 256 * 1024 * 1024;
const MAX_COMMAND_OUTPUT = 8 * 1024 * 1024;
const IO_CHUNK_BYTES = 64 * 1024;
const SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const FULL_GIT_OID_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

export class VerificationError extends Error {
  constructor(code, subject, message) {
    super(message);
    this.name = "VerificationError";
    this.code = code;
    this.subject = subject;
  }

  format() {
    return `LOVE_VERIFY_ERROR ${this.code} ${this.subject}: ${this.message}`;
  }
}

function fail(code, subject, message) {
  throw new VerificationError(code, subject, message);
}

function posixRelative(repoRoot, absolutePath) {
  const relative = path.relative(repoRoot, absolutePath);
  return relative === "" ? "." : relative.split(path.sep).join("/");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, subject) {
  if (!isPlainObject(value)) {
    fail("E_MANIFEST_SHAPE", subject, "expected an object");
  }
  return value;
}

function requireString(value, subject, { min = 1, max = 2_000 } = {}) {
  if (typeof value !== "string" || value.length < min || value.length > max || UNSAFE_TEXT_PATTERN.test(value)) {
    fail("E_MANIFEST_SHAPE", subject, "expected a bounded safe string");
  }
  return value;
}

function requireExact(value, expected, subject) {
  if (value !== expected) {
    fail("E_MANIFEST_IDENTITY", subject, `must equal ${JSON.stringify(expected)}`);
  }
}

function requireHttpsUrl(value, subject) {
  requireString(value, subject, { max: 2_000 });
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("E_MANIFEST_URL", subject, "must be an absolute HTTPS URL");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.hash !== "" ||
    parsed.href !== value
  ) {
    fail("E_MANIFEST_URL", subject, "must be a canonical HTTPS URL without credentials or a fragment");
  }
  return value;
}

function parseSemver(value, subject) {
  if (typeof value !== "string") {
    fail("E_SEMVER", subject, "must be a Semantic Versioning 2.0.0 string");
  }
  const match = SEMVER_PATTERN.exec(value);
  if (!match) {
    fail("E_SEMVER", subject, "must be a Semantic Versioning 2.0.0 string");
  }
  return {
    raw: value,
    core: [BigInt(match[1]), BigInt(match[2]), BigInt(match[3])],
    prerelease: match[4] === undefined ? null : match[4].split("."),
  };
}

function compareSemver(leftValue, rightValue) {
  const left = parseSemver(leftValue, "version");
  const right = parseSemver(rightValue, "version");
  for (let index = 0; index < 3; index += 1) {
    if (left.core[index] < right.core[index]) return -1;
    if (left.core[index] > right.core[index]) return 1;
  }
  if (left.prerelease === null && right.prerelease !== null) return 1;
  if (left.prerelease !== null && right.prerelease === null) return -1;
  if (left.prerelease !== null && right.prerelease !== null) {
    const count = Math.max(left.prerelease.length, right.prerelease.length);
    for (let index = 0; index < count; index += 1) {
      if (left.prerelease[index] === undefined) return -1;
      if (right.prerelease[index] === undefined) return 1;
      const a = left.prerelease[index];
      const b = right.prerelease[index];
      if (a === b) continue;
      const aNumeric = /^[0-9]+$/.test(a);
      const bNumeric = /^[0-9]+$/.test(b);
      if (aNumeric && bNumeric) return BigInt(a) < BigInt(b) ? -1 : 1;
      if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
      return a < b ? -1 : 1;
    }
  }
  return left.raw < right.raw ? -1 : left.raw > right.raw ? 1 : 0;
}

async function command(commandName, args, options, code, subject) {
  try {
    return await execFileAsync(commandName, args, {
      encoding: "utf8",
      maxBuffer: MAX_COMMAND_OUTPUT,
      windowsHide: true,
      ...options,
    });
  } catch (error) {
    const wrapped = new VerificationError(code, subject, `${commandName} exited unsuccessfully`);
    wrapped.exitCode = error?.code;
    throw wrapped;
  }
}

async function git(repoRoot, args, code, subject) {
  return command("git", ["-c", "core.hooksPath=/dev/null", ...args], { cwd: repoRoot }, code, subject);
}

async function gitPredicate(repoRoot, args, code, subject) {
  try {
    await git(repoRoot, args, code, subject);
    return true;
  } catch (error) {
    if (error instanceof VerificationError && error.exitCode === 1) return false;
    throw error;
  }
}

async function ensureDirectory(absolutePath, repoRoot, code = "E_LAYOUT", missingCode = code) {
  const subject = posixRelative(repoRoot, absolutePath);
  let stat;
  try {
    stat = await lstat(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") fail(missingCode, subject, "required directory is missing");
    fail(code, subject, "could not inspect directory");
  }
  if (stat.isSymbolicLink()) fail("E_SYMLINK", subject, "symbolic links are forbidden");
  if (!stat.isDirectory()) fail(code, subject, "must be a directory");
  return stat;
}

async function ensureRegularFile(absolutePath, repoRoot, { maxBytes = MAX_ARTIFACT_BYTES } = {}) {
  const subject = posixRelative(repoRoot, absolutePath);
  let stat;
  try {
    stat = await lstat(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") fail("E_FILE_MISSING", subject, "required regular file is missing");
    fail("E_FILE_READ", subject, "could not inspect file");
  }
  if (stat.isSymbolicLink()) fail("E_SYMLINK", subject, "symbolic links are forbidden");
  if (!stat.isFile()) fail("E_FILE_TYPE", subject, "must be a regular file");
  if (stat.size > maxBytes) fail("E_FILE_SIZE", subject, `exceeds the ${maxBytes}-byte verification limit`);
  return stat;
}

async function readBoundedFile(absolutePath, repoRoot, maxBytes = MAX_JSON_BYTES) {
  const before = await ensureRegularFile(absolutePath, repoRoot, { maxBytes });
  const subject = posixRelative(repoRoot, absolutePath);
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  let handle;
  try {
    handle = await open(absolutePath, fsConstants.O_RDONLY | noFollow);
    const opened = await handle.stat();
    if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) {
      fail("E_FILE_CHANGED", subject, "changed while being opened");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size || bytes.length !== opened.size) {
      fail("E_FILE_CHANGED", subject, "changed while being read");
    }
    return bytes;
  } catch (error) {
    if (error instanceof VerificationError) throw error;
    if (error?.code === "ELOOP") fail("E_SYMLINK", subject, "symbolic links are forbidden");
    fail("E_FILE_READ", subject, "could not read file safely");
  } finally {
    await handle?.close().catch(() => {});
  }
}

function parseJsonBytes(bytes, subject) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("E_JSON_UTF8", subject, "must contain valid UTF-8");
  }
  try {
    return JSON.parse(text);
  } catch {
    fail("E_JSON_PARSE", subject, "must contain valid JSON");
  }
}

async function hashRegularFile(absolutePath, repoRoot) {
  const before = await ensureRegularFile(absolutePath, repoRoot);
  const subject = posixRelative(repoRoot, absolutePath);
  if (before.size < 1) fail("E_FILE_SIZE", subject, "artifact must not be empty");
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  const digest = createHash("sha256");
  let handle;
  try {
    handle = await open(absolutePath, fsConstants.O_RDONLY | noFollow);
    const opened = await handle.stat();
    if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) {
      fail("E_FILE_CHANGED", subject, "changed while being opened");
    }
    const chunk = Buffer.allocUnsafe(IO_CHUNK_BYTES);
    let offset = 0;
    while (offset < opened.size) {
      const length = Math.min(chunk.length, opened.size - offset);
      const { bytesRead } = await handle.read(chunk, 0, length, offset);
      if (bytesRead === 0) fail("E_FILE_CHANGED", subject, "ended while being read");
      digest.update(chunk.subarray(0, bytesRead));
      offset += bytesRead;
    }
    const after = await handle.stat();
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size) {
      fail("E_FILE_CHANGED", subject, "changed while being hashed");
    }
    return { size: opened.size, sha256: digest.digest("hex") };
  } catch (error) {
    if (error instanceof VerificationError) throw error;
    if (error?.code === "ELOOP") fail("E_SYMLINK", subject, "symbolic links are forbidden");
    fail("E_FILE_READ", subject, "could not hash file safely");
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function filesAreEqual(leftPath, rightPath, repoRoot) {
  const leftStat = await ensureRegularFile(leftPath, repoRoot);
  const rightStat = await ensureRegularFile(rightPath, repoRoot);
  if (leftStat.size !== rightStat.size) return false;
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  let left;
  let right;
  try {
    left = await open(leftPath, fsConstants.O_RDONLY | noFollow);
    right = await open(rightPath, fsConstants.O_RDONLY | noFollow);
    const leftChunk = Buffer.allocUnsafe(IO_CHUNK_BYTES);
    const rightChunk = Buffer.allocUnsafe(IO_CHUNK_BYTES);
    for (let offset = 0; offset < leftStat.size; offset += IO_CHUNK_BYTES) {
      const length = Math.min(IO_CHUNK_BYTES, leftStat.size - offset);
      const [leftRead, rightRead] = await Promise.all([
        left.read(leftChunk, 0, length, offset),
        right.read(rightChunk, 0, length, offset),
      ]);
      if (
        leftRead.bytesRead !== length ||
        rightRead.bytesRead !== length ||
        !leftChunk.subarray(0, length).equals(rightChunk.subarray(0, length))
      ) return false;
    }
    return true;
  } finally {
    await Promise.all([left?.close().catch(() => {}), right?.close().catch(() => {})]);
  }
}

function validateManifestShape(manifest, version, subject) {
  requireObject(manifest, subject);
  requireExact(manifest.protocol, "love-package/v1", `${subject}#protocol`);
  requireExact(manifest.document_type, "package-manifest", `${subject}#document_type`);
  requireExact(manifest.name, PACKAGE_NAME, `${subject}#name`);
  requireExact(manifest.version, version, `${subject}#version`);
  parseSemver(manifest.version, `${subject}#version`);
  requireString(manifest.description, `${subject}#description`);
  requireString(manifest.license, `${subject}#license`, { max: 500 });

  const artifact = requireObject(manifest.artifact, `${subject}#artifact`);
  const expectedFilename = `${PACKAGE_NAME}-${version}.tgz`;
  requireExact(artifact.format, "npm-tarball", `${subject}#artifact.format`);
  requireExact(artifact.filename, expectedFilename, `${subject}#artifact.filename`);
  if (!/^[0-9a-f]{64}$/.test(artifact.sha256)) {
    fail("E_MANIFEST_HASH", `${subject}#artifact.sha256`, "must be a lowercase SHA-256 digest");
  }
  if (!Number.isSafeInteger(artifact.size) || artifact.size < 1 || artifact.size > MAX_ARTIFACT_BYTES) {
    fail("E_MANIFEST_SIZE", `${subject}#artifact.size`, "must be a non-zero bounded safe integer");
  }
  requireExact(artifact.media_type, "application/gzip", `${subject}#artifact.media_type`);

  const pagesUrl = `https://cambridgetcg.github.io/whitehack/packages/v1/${PACKAGE_NAME}/${version}/${expectedFilename}`;
  const releaseUrl = `https://github.com/cambridgetcg/whitehack/releases/download/whitehack-v${version}/${expectedFilename}`;
  const npmUrl = `https://registry.npmjs.org/${PACKAGE_NAME}/-/${expectedFilename}`;
  if (!Array.isArray(artifact.mirrors) || artifact.mirrors.length < 2 || artifact.mirrors.length > 3) {
    fail("E_MANIFEST_MIRRORS", `${subject}#artifact.mirrors`, "must contain the canonical Pages and GitHub mirrors, with optional npm mirror");
  }
  const mirrorUrls = artifact.mirrors.map((entry, index) => {
    const mirror = requireObject(entry, `${subject}#artifact.mirrors[${index}]`);
    return requireHttpsUrl(mirror.url, `${subject}#artifact.mirrors[${index}].url`);
  });
  if (new Set(mirrorUrls).size !== mirrorUrls.length) {
    fail("E_MANIFEST_MIRRORS", `${subject}#artifact.mirrors`, "must not contain duplicate mirrors");
  }
  if (
    mirrorUrls[0] !== pagesUrl ||
    !mirrorUrls.includes(releaseUrl) ||
    mirrorUrls.some((url) => ![pagesUrl, releaseUrl, npmUrl].includes(url))
  ) {
    fail("E_MANIFEST_MIRRORS", `${subject}#artifact.mirrors`, "contains a non-canonical or missing Whitehack mirror");
  }

  const runtime = requireObject(manifest.runtime, `${subject}#runtime`);
  requireExact(runtime.kind, "javascript", `${subject}#runtime.kind`);
  const engines = requireObject(runtime.engines, `${subject}#runtime.engines`);
  if (Object.keys(engines).length !== 1) {
    fail("E_MANIFEST_RUNTIME", `${subject}#runtime.engines`, "Whitehack must declare exactly its Node.js engine floor");
  }
  requireString(engines.node, `${subject}#runtime.engines.node`, { max: 200 });

  const install = requireObject(manifest.install, `${subject}#install`);
  requireExact(install.format, "npm-tarball", `${subject}#install.format`);
  requireExact(install.specifier, pagesUrl, `${subject}#install.specifier`);
  requireHttpsUrl(install.specifier, `${subject}#install.specifier`);

  const source = requireObject(manifest.source, `${subject}#source`);
  requireExact(source.repository, SOURCE_REPOSITORY, `${subject}#source.repository`);
  if (!FULL_GIT_OID_PATTERN.test(source.revision)) {
    fail("E_SOURCE_REVISION", `${subject}#source.revision`, "must be a full lowercase Git object ID");
  }
  requireExact(source.path, ".", `${subject}#source.path`);

  const dependencies = requireObject(manifest.dependency_resolution, `${subject}#dependency_resolution`);
  requireExact(dependencies.mode, "package_manifest", `${subject}#dependency_resolution.mode`);
  requireExact(dependencies.self_contained, true, `${subject}#dependency_resolution.self_contained`);

  return { artifact, source, engines, expectedFilename, pagesUrl };
}

function normalizedRepository(packageJson) {
  const repository = typeof packageJson.repository === "string"
    ? packageJson.repository
    : packageJson.repository?.url;
  if (typeof repository !== "string") return null;
  return repository.startsWith("git+") ? repository.slice(4) : repository;
}

function validateSourcePackage(packageJson, manifest, details, subject) {
  requireObject(packageJson, subject);
  requireExact(packageJson.name, manifest.name, `${subject}#name`);
  requireExact(packageJson.version, manifest.version, `${subject}#version`);
  requireExact(packageJson.license, manifest.license, `${subject}#license`);
  requireExact(normalizedRepository(packageJson), SOURCE_REPOSITORY, `${subject}#repository`);
  requireExact(packageJson.engines?.node, details.engines.node, `${subject}#engines.node`);

  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    const value = packageJson[field];
    if (value !== undefined && (!isPlainObject(value) || Object.keys(value).length !== 0)) {
      fail("E_SELF_CONTAINED", `${subject}#${field}`, "self-contained Whitehack must not require separately resolved packages");
    }
  }
  for (const field of ["bundleDependencies", "bundledDependencies"]) {
    const value = packageJson[field];
    if (value !== undefined && (!Array.isArray(value) || value.length !== 0)) {
      fail("E_SELF_CONTAINED", `${subject}#${field}`, "self-contained Whitehack must not declare bundled dependencies");
    }
  }
  const lifecycleNames = new Set([
    "preinstall", "install", "postinstall", "prepack", "prepare", "postpack", "prepublish", "prepublishOnly", "publish", "postpublish",
  ]);
  if (isPlainObject(packageJson.scripts) && Object.keys(packageJson.scripts).some((name) => lifecycleNames.has(name))) {
    fail("E_LIFECYCLE_SCRIPT", `${subject}#scripts`, "release packages must not declare npm lifecycle hooks");
  }
}

async function verifySourceAndRepack({ repoRoot, manifest, details, artifactPath, npmCommand }) {
  const revision = details.source.revision;
  const manifestSubject = `packages/v1/${PACKAGE_NAME}/${manifest.version}/manifest.json`;
  const resolved = (await git(repoRoot, ["rev-parse", "--verify", `${revision}^{commit}`], "E_SOURCE_REVISION", `${manifestSubject}#source.revision`)).stdout.trim();
  if (resolved !== revision) {
    fail("E_SOURCE_REVISION", `${manifestSubject}#source.revision`, "does not resolve to the recorded full commit ID");
  }
  if (!await gitPredicate(repoRoot, ["merge-base", "--is-ancestor", revision, "HEAD"], "E_SOURCE_ANCESTRY", `${manifestSubject}#source.revision`)) {
    fail("E_SOURCE_ANCESTRY", `${manifestSubject}#source.revision`, "must be an ancestor of HEAD");
  }

  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "whitehack-love-verify-"));
  const worktreePath = path.join(temporaryRoot, "source");
  const packPath = path.join(temporaryRoot, "pack");
  const homePath = path.join(temporaryRoot, "home");
  const npmrcPath = path.join(temporaryRoot, "empty.npmrc");
  let worktreeAdded = false;
  try {
    await git(repoRoot, ["worktree", "add", "--detach", worktreePath, revision], "E_WORKTREE", `${manifestSubject}#source.revision`);
    worktreeAdded = true;
    await Promise.all([
      mkdir(packPath, { recursive: false }),
      mkdir(homePath, { recursive: false }),
      writeFile(npmrcPath, "", { flag: "wx", mode: 0o600 }),
    ]);

    const sourcePath = path.join(worktreePath, ...details.source.path.split("/"));
    await ensureDirectory(sourcePath, worktreePath, "E_SOURCE_PATH");
    const sourceReal = await realpath(sourcePath);
    const worktreeReal = await realpath(worktreePath);
    if (sourceReal !== worktreeReal && !sourceReal.startsWith(`${worktreeReal}${path.sep}`)) {
      fail("E_SOURCE_PATH", `${manifestSubject}#source.path`, "must remain inside the detached source worktree");
    }
    const packageJsonPath = path.join(sourcePath, "package.json");
    const packageJson = parseJsonBytes(
      await readBoundedFile(packageJsonPath, worktreePath),
      `${manifestSubject}#source.package.json`,
    );
    validateSourcePackage(packageJson, manifest, details, `${manifestSubject}#source.package.json`);

    const npmEnvironment = {
      PATH: process.env.PATH ?? "",
      HOME: homePath,
      TMPDIR: temporaryRoot,
      LANG: "C",
      LC_ALL: "C",
      npm_config_userconfig: npmrcPath,
      npm_config_cache: path.join(temporaryRoot, "npm-cache"),
      npm_config_ignore_scripts: "true",
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_update_notifier: "false",
    };
    if (process.platform === "win32" && process.env.SystemRoot) npmEnvironment.SystemRoot = process.env.SystemRoot;
    const packed = await command(
      npmCommand,
      ["pack", "--ignore-scripts", "--json", "--pack-destination", packPath, "."],
      { cwd: sourcePath, env: npmEnvironment },
      "E_NPM_PACK",
      `${manifestSubject}#artifact`,
    );
    let packReport;
    try {
      packReport = JSON.parse(packed.stdout);
    } catch {
      fail("E_NPM_PACK_OUTPUT", `${manifestSubject}#artifact`, "npm pack did not return valid JSON");
    }
    if (!Array.isArray(packReport) || packReport.length !== 1 || packReport[0]?.filename !== details.expectedFilename) {
      fail("E_NPM_PACK_OUTPUT", `${manifestSubject}#artifact`, "npm pack returned an unexpected artifact identity");
    }
    const packEntries = (await readdir(packPath)).sort();
    if (packEntries.length !== 1 || packEntries[0] !== details.expectedFilename) {
      fail("E_NPM_PACK_OUTPUT", `${manifestSubject}#artifact`, "npm pack destination contains unexpected entries");
    }
    const reproducedPath = path.join(packPath, details.expectedFilename);
    if (!await filesAreEqual(artifactPath, reproducedPath, repoRoot)) {
      fail("E_REPACK_MISMATCH", posixRelative(repoRoot, artifactPath), "does not byte-match npm pack of its recorded source revision");
    }
  } finally {
    if (worktreeAdded) {
      await git(repoRoot, ["worktree", "remove", "--force", worktreePath], "E_WORKTREE_CLEANUP", `${manifestSubject}#source.revision`).catch(() => {});
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function verifyBaseImmutability(repoRoot, base) {
  if (!FULL_GIT_OID_PATTERN.test(base)) {
    fail("E_BASE_REVISION", "--base", "must be a full lowercase Git commit ID");
  }
  const resolved = (await git(repoRoot, ["rev-parse", "--verify", `${base}^{commit}`], "E_BASE_REVISION", "--base")).stdout.trim();
  if (resolved !== base) fail("E_BASE_REVISION", "--base", "does not resolve to the supplied full commit ID");
  if (!await gitPredicate(repoRoot, ["merge-base", "--is-ancestor", base, "HEAD"], "E_BASE_ANCESTRY", "--base")) {
    fail("E_BASE_ANCESTRY", "--base", "must be an ancestor of HEAD");
  }
  const tree = await git(repoRoot, ["ls-tree", "-r", "--name-only", base, "--", "packages/v1"], "E_BASE_TREE", "--base");
  const roots = new Set();
  for (const entry of tree.stdout.split("\n").filter(Boolean)) {
    if (UNSAFE_TEXT_PATTERN.test(entry) || entry.includes("\\")) {
      fail("E_BASE_TREE", "--base", "contains an unsafe package path");
    }
    const parts = entry.split("/");
    if (parts[0] !== "packages" || parts[1] !== "v1" || parts[2] === "index.json") continue;
    if (parts.length < 5 || parts[2] !== PACKAGE_NAME || !SEMVER_PATTERN.test(parts[3])) {
      fail("E_BASE_TREE", "--base", "contains an unsupported package layout");
    }
    roots.add(parts.slice(0, 4).join("/"));
  }
  for (const root of [...roots].sort()) {
    const unchanged = await gitPredicate(repoRoot, ["diff", "--quiet", "--no-ext-diff", base, "--", root], "E_BASE_DIFF", root);
    if (!unchanged) {
      fail("E_IMMUTABLE_VERSION_CHANGED", root, "a version root present at --base was modified or deleted");
    }
  }
}

function validateIndex(index, versions, subject) {
  requireObject(index, subject);
  requireExact(index.protocol, "love-package/v1", `${subject}#protocol`);
  requireExact(index.document_type, "package-index", `${subject}#document_type`);
  if (!Array.isArray(index.packages) || index.packages.length !== 1) {
    fail("E_INDEX_SHAPE", `${subject}#packages`, "must contain exactly the Whitehack package entry");
  }
  const packageEntry = requireObject(index.packages[0], `${subject}#packages[0]`);
  requireExact(packageEntry.name, PACKAGE_NAME, `${subject}#packages[0].name`);
  if (!Array.isArray(packageEntry.versions) || packageEntry.versions.length !== versions.length) {
    fail("E_INDEX_COVERAGE", `${subject}#packages[0].versions`, "must enumerate every checked-in version exactly once");
  }
  const sortedVersions = [...versions].sort(compareSemver);
  for (let indexPosition = 0; indexPosition < sortedVersions.length; indexPosition += 1) {
    const expectedVersion = sortedVersions[indexPosition];
    const versionEntry = requireObject(packageEntry.versions[indexPosition], `${subject}#packages[0].versions[${indexPosition}]`);
    requireExact(versionEntry.version, expectedVersion, `${subject}#packages[0].versions[${indexPosition}].version`);
    requireExact(
      versionEntry.manifest_url,
      `https://cambridgetcg.github.io/whitehack/packages/v1/${PACKAGE_NAME}/${expectedVersion}/manifest.json`,
      `${subject}#packages[0].versions[${indexPosition}].manifest_url`,
    );
    requireHttpsUrl(versionEntry.manifest_url, `${subject}#packages[0].versions[${indexPosition}].manifest_url`);
  }
  requireExact(packageEntry.latest, sortedVersions.at(-1), `${subject}#packages[0].latest`);
}

export async function verifyLovePackages({
  repoRoot = DEFAULT_REPO_ROOT,
  base = null,
  allowEmpty = false,
  npmCommand = process.platform === "win32" ? "npm.cmd" : "npm",
} = {}) {
  repoRoot = path.resolve(repoRoot);
  const gitRoot = (await git(repoRoot, ["rev-parse", "--show-toplevel"], "E_NOT_GIT", ".")).stdout.trim();
  if (await realpath(gitRoot) !== await realpath(repoRoot)) {
    fail("E_REPO_ROOT", ".", "verifier must run against the Git worktree root");
  }
  if (base !== null) await verifyBaseImmutability(repoRoot, base);

  const npmVersion = (await command(
    npmCommand,
    ["--version"],
    { cwd: repoRoot },
    "E_NPM_VERSION",
    npmCommand,
  )).stdout.trim();
  if (npmVersion !== EXPECTED_NPM_VERSION) {
    fail("E_NPM_VERSION", npmCommand, `must resolve to npm ${EXPECTED_NPM_VERSION}, received ${npmVersion || "no version"}`);
  }

  const packagesPath = path.join(repoRoot, "packages");
  const v1Path = path.join(packagesPath, "v1");
  try {
    await ensureDirectory(packagesPath, repoRoot, "E_LAYOUT", "E_PACKAGES_MISSING");
  } catch (error) {
    if (allowEmpty && error instanceof VerificationError && error.code === "E_PACKAGES_MISSING") {
      return { packageCount: 0, versionCount: 0, artifactCount: 0 };
    }
    throw error;
  }
  const packageRootEntries = (await readdir(packagesPath)).sort();
  if (packageRootEntries.length === 0 && allowEmpty) {
    return { packageCount: 0, versionCount: 0, artifactCount: 0 };
  }
  if (packageRootEntries.length !== 1 || packageRootEntries[0] !== "v1") {
    fail("E_LAYOUT_EXTRA", "packages", "must contain only the v1 protocol directory");
  }
  await ensureDirectory(v1Path, repoRoot);
  const v1Entries = (await readdir(v1Path)).sort();
  if (v1Entries.length === 0) {
    if (allowEmpty) return { packageCount: 0, versionCount: 0, artifactCount: 0 };
    fail("E_EMPTY", "packages/v1", "contains no package versions; pass --allow-empty only during bootstrap");
  }
  if (v1Entries.length !== 2 || v1Entries[0] !== "index.json" || v1Entries[1] !== PACKAGE_NAME) {
    fail("E_LAYOUT_EXTRA", "packages/v1", "must contain only index.json and the whitehack package directory");
  }

  const indexPath = path.join(v1Path, "index.json");
  await ensureRegularFile(indexPath, repoRoot, { maxBytes: MAX_JSON_BYTES });
  const packagePath = path.join(v1Path, PACKAGE_NAME);
  await ensureDirectory(packagePath, repoRoot);
  const versions = (await readdir(packagePath)).sort(compareSemver);
  if (versions.length === 0) fail("E_EMPTY", posixRelative(repoRoot, packagePath), "contains no package versions");

  for (const version of versions) {
    parseSemver(version, `packages/v1/${PACKAGE_NAME}/${version}`);
    const versionPath = path.join(packagePath, version);
    await ensureDirectory(versionPath, repoRoot);
    const manifestPath = path.join(versionPath, "manifest.json");
    const manifestSubject = posixRelative(repoRoot, manifestPath);
    const manifest = parseJsonBytes(await readBoundedFile(manifestPath, repoRoot), manifestSubject);
    const details = validateManifestShape(manifest, version, manifestSubject);
    const entries = (await readdir(versionPath)).sort();
    const expectedEntries = ["manifest.json", details.expectedFilename].sort();
    if (entries.length !== expectedEntries.length || entries.some((entry, index) => entry !== expectedEntries[index])) {
      fail("E_VERSION_EXTRA", posixRelative(repoRoot, versionPath), "must contain exactly manifest.json and its declared artifact");
    }
    const artifactPath = path.join(versionPath, details.expectedFilename);
    const identity = await hashRegularFile(artifactPath, repoRoot);
    if (identity.size !== details.artifact.size) {
      fail("E_ARTIFACT_SIZE", posixRelative(repoRoot, artifactPath), "does not match manifest artifact.size");
    }
    if (identity.sha256 !== details.artifact.sha256) {
      fail("E_ARTIFACT_HASH", posixRelative(repoRoot, artifactPath), "does not match manifest artifact.sha256");
    }
    await verifySourceAndRepack({ repoRoot, manifest, details, artifactPath, npmCommand });
  }

  const indexSubject = posixRelative(repoRoot, indexPath);
  const index = parseJsonBytes(await readBoundedFile(indexPath, repoRoot), indexSubject);
  validateIndex(index, versions, indexSubject);
  return { packageCount: 1, versionCount: versions.length, artifactCount: versions.length };
}

function usage() {
  return "Usage: node scripts/verify-love-packages.mjs [--base <full-commit-sha>] [--allow-empty]";
}

function parseArguments(argv) {
  let base = null;
  let allowEmpty = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--allow-empty" && !allowEmpty) {
      allowEmpty = true;
      continue;
    }
    if (argument === "--base" && base === null && index + 1 < argv.length) {
      base = argv[index + 1];
      index += 1;
      continue;
    }
    fail("E_ARGUMENT", argument, "unknown, duplicate, or incomplete option");
  }
  return { help: false, base, allowEmpty };
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    const result = await verifyLovePackages(options);
    process.stdout.write(`LOVE_VERIFY_OK packages=${result.packageCount} versions=${result.versionCount} artifacts=${result.artifactCount}\n`);
  } catch (error) {
    const verificationError = error instanceof VerificationError
      ? error
      : new VerificationError("E_INTERNAL", ".", "verification failed unexpectedly");
    process.stderr.write(`${verificationError.format()}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
