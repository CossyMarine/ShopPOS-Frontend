import sharp from "sharp";

const SRC = "src/Assets/logo.png";
const OUT = "public";
const BG = "#FF5722";

// Generate an icon with the Chemaluk logo centered.
async function icon(size, name, padding = 0.15) {
  const innerSize = Math.round(size * (1 - padding * 2));

  const logo = await sharp(SRC)
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      {
        input: logo,
        gravity: "center",
      },
    ])
    .png()
    .toFile(`${OUT}/${name}`);

  console.log("Generated:", name);
}

// Standard PWA icons
await icon(192, "pwa-192x192.png");
await icon(512, "pwa-512x512.png");

// Apple home-screen icon
await icon(180, "apple-touch-icon.png");

// Android maskable icon (extra safe padding)
await icon(512, "pwa-maskable-512x512.png", 0.25);

console.log("All Chemaluk icons generated successfully!");
