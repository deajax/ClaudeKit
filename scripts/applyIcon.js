const path = require('path');
const { rcedit } = require('rcedit');

exports.default = async function (context) {
  if (process.platform !== 'win32') return;

  const { appOutDir, packager } = context;
  const exeName = `${packager.appInfo.productFilename}.exe`;
  const exePath = path.join(appOutDir, exeName);

  try {
    const iconPath = await packager.getIconPath();
    if (!iconPath) return;

    await rcedit(exePath, { icon: iconPath });
    console.log('  • afterPack: icon applied');
  } catch (e) {
    console.warn('  • afterPack: icon failed:', e.message);
  }
};
