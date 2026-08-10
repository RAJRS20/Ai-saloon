const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('Aura_AI_New_FalAI_Hairstyle_TryOn_Implementation.docx');
let offset = 0;
const files = [];
while (offset < buf.length - 4) {
    if (buf[offset] === 0x50 && buf[offset+1] === 0x4B && buf[offset+2] === 0x03 && buf[offset+3] === 0x04) {
        const fnLen = buf.readUInt16LE(offset + 26);
        const extraLen = buf.readUInt16LE(offset + 28);
        const compSize = buf.readUInt32LE(offset + 18);
        const compression = buf.readUInt16LE(offset + 8);
        const fnStart = offset + 30;
        const filename = buf.slice(fnStart, fnStart + fnLen).toString('utf8');
        const dataStart = fnStart + fnLen + extraLen;
        files.push({ filename, compSize, compression, dataStart });
        offset = dataStart + compSize;
    } else {
        offset++;
    }
}

const docFile = files.find(f => f.filename === 'word/document.xml');
if (docFile) {
    const compressed = buf.slice(docFile.dataStart, docFile.dataStart + docFile.compSize);
    const xml = docFile.compression === 8 ? zlib.inflateRawSync(compressed).toString('utf8') : compressed.toString('utf8');
    const text = xml
        .replace(/<w:p[ >]/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    fs.writeFileSync('fal_doc_content.txt', text);
    console.log('Done, length:', text.length);
}
