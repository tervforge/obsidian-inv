// Packs dist/ into dist/invoklet-markdown.zip for manual installation: the archive holds one
// folder, invoklet-markdown/, ready to be unpacked into <vault>/.obsidian/plugins/.
// Pure Node (no zip tool or dependencies), so it behaves the same on every OS and in CI.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const dist = path.join(__dirname, 'dist');
const FOLDER = 'invoklet-markdown';
const FILES = ['main.js', 'manifest.json', 'styles.css'];
const ARCHIVE = path.join(dist, FOLDER + '.zip');

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

// Fixed timestamp (1980-01-01, the ZIP epoch) so the same input gives a byte-identical archive.
const DOS_TIME = 0, DOS_DATE = (0 << 9) | (1 << 5) | 1;

function zip(entries) {
    const locals = [], centrals = [];
    let offset = 0;
    for (const { name, data } of entries) {
        const nameBytes = Buffer.from(name, 'utf8');
        const compressed = zlib.deflateRawSync(data, { level: 9 });
        const crc = crc32(data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(8, 8); local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12);
        local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBytes.length, 26);
        locals.push(local, nameBytes, compressed);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(DOS_TIME, 12);
        central.writeUInt16LE(DOS_DATE, 14); central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42);
        centrals.push(central, nameBytes);
        offset += local.length + nameBytes.length + compressed.length;
    }
    const centralSize = centrals.reduce((sum, b) => sum + b.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, ...centrals, end]);
}

const entries = FILES.map(file => {
    const source = path.join(dist, file);
    if (!fs.existsSync(source)) throw new Error(`package: dist/${file} is missing; run npm run build first`);
    return { name: `${FOLDER}/${file}`, data: fs.readFileSync(source) };
});
fs.writeFileSync(ARCHIVE, zip(entries));
console.log(`Packed dist/${FOLDER}.zip: ${entries.map(e => e.name).join(', ')}`);
