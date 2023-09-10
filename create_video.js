const path = require('path');

const inputDir = path.join(__dirname, 'output_diff');
const outputDir = path.join(__dirname, 'output_video');

const fs = require('fs');

const util = require('util');

const exec = util.promisify(require('child_process').exec);

if (fs.existsSync(outputDir)) {
    fs.rmdirSync(outputDir, { recursive: true });
}
fs.mkdirSync(outputDir);

const createVideoFromFrames = async (inputDir, outputDir) => {

    await exec(`ffmpeg -framerate 24 -i ${inputDir}/frame_%d_diff.png -c:v libx264 -profile:v high -crf 20 -pix_fmt yuv420p ${outputDir}/output.mp4`);
}

createVideoFromFrames(inputDir, outputDir);