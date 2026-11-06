import sharp from 'sharp';
export async function pdfFixture(types = ['text']) {
  const objects = [null],
    add = (content) => {
      objects.push(Buffer.isBuffer(content) ? content : Buffer.from(content));
      return objects.length - 1;
    };
  const catalog = add(''),
    pages = add(''),
    font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
    ids = [];
  for (const type of types) {
    let imageId, commands;
    if (type === 'scan') {
      const image = await sharp(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><text x="35" y="90" font-size="22">Circle geometry</text><text x="35" y="140" font-size="18">A radius joins the centre to the boundary.</text></svg>'
        )
      )
        .jpeg()
        .toBuffer();
      imageId = add(
        Buffer.concat([
          Buffer.from(
            `<< /Type /XObject /Subtype /Image /Width 600 /Height 800 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`
          ),
          image,
          Buffer.from('\nendstream'),
        ])
      );
      commands = 'q 595 0 0 842 0 0 cm /Im0 Do Q';
    } else
      commands =
        'BT /F1 12 Tf 40 780 Td (Native text: a radius joins the centre to the boundary of a circle.) Tj 0 -24 Td (A diameter passes through the centre and is twice the radius.) Tj ET';
    const stream = add(
        `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`
      ),
      page = add(
        `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> ${imageId ? `/XObject << /Im0 ${imageId} 0 R >>` : ''} >> /Contents ${stream} 0 R >>`
      );
    ids.push(page);
  }
  objects[catalog] = Buffer.from(`<< /Type /Catalog /Pages ${pages} 0 R >>`);
  objects[pages] = Buffer.from(
    `<< /Type /Pages /Kids [${ids.map((id) => `${id} 0 R`).join(' ')}] /Count ${ids.length} >>`
  );
  const parts = [Buffer.from('%PDF-1.4\n')],
    offsets = [0];
  let length = parts[0].length;
  for (let i = 1; i < objects.length; i++) {
    offsets.push(length);
    const part = Buffer.concat([
      Buffer.from(`${i} 0 obj\n`),
      objects[i],
      Buffer.from('\nendobj\n'),
    ]);
    parts.push(part);
    length += part.length;
  }
  parts.push(
    Buffer.from(
      `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n')
        .join(
          ''
        )}trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${length}\n%%EOF`
    )
  );
  return Buffer.concat(parts);
}
