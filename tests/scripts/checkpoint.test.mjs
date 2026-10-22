import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../scripts/checkpoint.mjs', import.meta.url));
function fixture(t) {
    const root = mkdtempSync(path.join(tmpdir(), 'repairdesk-checkpoint-'));
    t.after(() => {
        // Only remove the temporary fixture created by this test.
        assert.equal(path.dirname(root), path.resolve(tmpdir()));
        assert.ok(path.basename(root).startsWith('repairdesk-checkpoint-'));
        rmSync(root, { recursive: true, force: true });
    });
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    mkdirSync(path.join(root, 'scripts'));
    copyFileSync(script, path.join(root, 'scripts/checkpoint.mjs'));
    writeFileSync(path.join(root, '.gitignore'), '/backups/\n');
    writeFileSync(path.join(root, 'README.md'), 'first snapshot\n');
    git('init');
    git('add', '.');
    const commit = () => git('-c', 'user.name=Checkpoint fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture snapshot');
    commit();
    const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/checkpoint.mjs'), 'saved'], { cwd: root, encoding: 'utf8' });
    const archive = path.join(root, 'backups/saved.tar');
    return { root, git, commit, run, archive, manifest: `${archive}.json` };
}

test('reusing a checkpoint name preserves the original archive, manifest and tag', t => {
    const f = fixture(t);
    assert.equal(f.run().status, 0);
    const archive = readFileSync(f.archive);
    const manifest = readFileSync(f.manifest);
    const tag = f.git('rev-parse', 'checkpoint/saved');
    writeFileSync(path.join(f.root, 'README.md'), 'new snapshot\n');
    f.git('add', 'README.md');
    f.commit();
    const retry = f.run();
    assert.notEqual(retry.status, 0);
    assert.match(retry.stderr, /already exists/i);
    assert.deepEqual(readFileSync(f.archive), archive);
    assert.deepEqual(readFileSync(f.manifest), manifest);
    assert.equal(f.git('rev-parse', 'checkpoint/saved'), tag);
});

for (const collision of ['archive', 'manifest', 'tag']) {
    test(`a preexisting ${collision} rejects the checkpoint before creating other artifacts`, t => {
        const f = fixture(t);
        if (collision === 'tag') f.git('tag', 'checkpoint/saved');
        else {
            mkdirSync(path.join(f.root, 'backups'));
            writeFileSync(f[collision], 'preserve this artifact');
        }
        const result = f.run();
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /already exists/i);
        assert.equal(existsSync(f.archive), collision === 'archive');
        assert.equal(existsSync(f.manifest), collision === 'manifest');
        if (collision !== 'tag') {
            assert.equal(readFileSync(f[collision], 'utf8'), 'preserve this artifact');
            assert.equal(f.git('tag', '--list', 'checkpoint/saved'), '');
        }
    });
}
