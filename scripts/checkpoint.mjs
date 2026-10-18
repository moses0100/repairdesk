import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const name =
    process.argv[2] ||
    new Date()
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, 14);
if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(name))
    throw new Error("Use a short lowercase checkpoint name");
const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
if (git("status", "--porcelain"))
    throw new Error("Commit working changes before creating a checkpoint");
const archive = path.join(root, "backups", `${name}.tar`);
mkdirSync(path.dirname(archive), { recursive: true });
git("archive", "--format=tar", `--output=${archive}`, "HEAD");
const checksum = createHash("sha256")
    .update(readFileSync(archive))
    .digest("hex");
const tag = `checkpoint/${name}`;
git("tag", tag);
writeFileSync(
    `${archive}.json`,
    JSON.stringify(
        { commit: git("rev-parse", "HEAD"), tag, sha256: checksum },
        null,
        2,
    ) + "\n",
);
console.log(JSON.stringify({ archive, tag, sha256: checksum }));
