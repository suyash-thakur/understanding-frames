const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const input = 'input-3.mp4';

// Output directory for MP4 files, metadata, and images
const outputDir = path.join(__dirname, 'output');
const framesDir = path.join(__dirname, 'frames');

// Recreate the output directory
if (fs.existsSync(outputDir)) {
    fs.rmdirSync(outputDir, { recursive: true });
}

if (fs.existsSync(framesDir)) {
    fs.rmdirSync(framesDir, { recursive: true });
}

fs.mkdirSync(outputDir);
fs.mkdirSync(framesDir);

const extractMetadataAndImage = async (keyframeFilePath) => {
    // Extract metadata from the keyframe file using FFprobe
    const { stdout } = await exec(`ffprobe -v error -show_entries stream=width,height,r_frame_rate,duration -of json -hide_banner ${keyframeFilePath}`);

    // Parse the JSON output
    const metadata = JSON.parse(stdout);

    // Generate an image of the keyframe using FFmpeg
    const imageFileName = path.basename(keyframeFilePath, '.mp4') + '.png';
    const imageFilePath = path.join(outputDir, imageFileName);
    await exec(`ffmpeg -i ${keyframeFilePath} -vframes 1 -vf "select=eq(n\\,0)" ${imageFilePath}`);

    // Write the metadata to a JSON file
    const metadataFileName = path.basename(keyframeFilePath, '.mp4') + '.json';
    const metadataFilePath = path.join(outputDir, metadataFileName);
    fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));

    console.log(`Saved metadata to: ${metadataFilePath}`);
    console.log(`Saved keyframe image to: ${imageFilePath}`);
};

// Extract all the frames from the video
const extractFrames = async (input, output) => {
    await exec(`ffmpeg -i ${input} -vf "fps=24" ${output}/frame_%d.png`);
};


const child = spawn('ffmpeg', [
    '-i', input,
    '-map', '0',
    '-c', 'copy',
    '-f', 'segment',
    '-segment_format', 'mp4',
    '-reset_timestamps', '1',
    '-map_metadata', '-1',
    '-map_chapters', '-1',
    `${outputDir}/output_%03d.mp4`
]);

child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

child.on('close', async (code) => {
    console.log(`child process exited with code ${code}`);

    // List the output directory to extract metadata and generate images
    fs.readdir(outputDir, (err, files) => {
        if (err) {
            console.error(`Error reading output directory: ${err}`);
            return;
        }

        // Iterate through the keyframe files and extract metadata and generate images
        files.forEach(async (file) => {
            const keyframeFilePath = path.join(outputDir, file);
            if (keyframeFilePath.endsWith('.mp4')) {
                await extractMetadataAndImage(keyframeFilePath);
            }
        });
    });

    await extractFrames(input, framesDir);

});
