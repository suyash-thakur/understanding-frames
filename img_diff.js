const fs = require('fs');
const path = require('path');
const util = require('util');

const tf = require('@tensorflow/tfjs-node');
const outputDir = path.join(__dirname, 'output_diff');
const inputDir = path.join(__dirname, 'frames');

// Recreate the output directory
if (fs.existsSync(outputDir)) {
  fs.rmdirSync(outputDir, { recursive: true });
}
fs.mkdirSync(outputDir);



// Function to compute frame difference
const computeFrameDifference = async (prevFramePath, currentFramePath, outputImageFileName) => {
  // Load and preprocess the previous and current frames
  const prevFrame = await loadImage(prevFramePath);
  const currentFrame = await loadImage(currentFramePath);

  // Compute the absolute difference between frames
  const frameDiff = tf.abs(tf.sub(prevFrame, currentFrame));


  // Threshold the difference frame to emphasize changes
  // const thresholdedDiff = frameDiff.greater(tf.scalar(30)).mul(tf.scalar(255));

  // console.log(prevFramePath);

  // Save the thresholded difference frame as an image
  const outputImageFilePath = path.join(outputDir, outputImageFileName);
  const outputImageBuffer = await tf.node.encodePng(frameDiff);
  await fs.writeFileSync(outputImageFilePath, outputImageBuffer);


  // Dispose the tensors to free memory
  frameDiff.dispose();
  // thresholdedDiff.dispose();
  prevFrame.dispose();
  currentFrame.dispose();
};

// Helper function to load an image using TensorFlow.js
const loadImage = async (filePath) => {
  const buffer = await fs.readFileSync(filePath);
  const tensor = tf.node.decodeImage(buffer);
  return tensor;
};

// List the output directory to extract keyframes and frames in between
fs.readdir(inputDir, async (err, files) => {
  if (err) {
    console.error(`Error reading output directory: ${err}`);
    return;
  }

  // Sort files to ensure proper order
  files = files.sort((a, b) => {
    return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
  });

  let prevKeyframePath = null;

  // Iterate through the files and process them
  for (const file of files) {
    console.log(`Processing file: ${file}`);
    const filePath = path.join(inputDir, file);

    // Skip directories
    if (fs.lstatSync(filePath).isDirectory()) {
      continue;
    }

    // Extract keyframes
    if (filePath.endsWith('.png')) {
      if (prevKeyframePath === null) {
        prevKeyframePath = filePath;
        continue;
      }
      // Compute the frame difference
      const outputImageFileName = path.basename(filePath, '.png') + '_diff.png';
      await computeFrameDifference(prevKeyframePath, filePath, outputImageFileName);

      // Update the previous keyframe path
      prevKeyframePath = filePath;
    }
  }
});