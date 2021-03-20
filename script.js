const imageUpload = document.getElementById("imageUpload");

Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
]).then(start);

async function start() {
  const container = document.createElement("div");
  container.style.position = "relative";
  document.body.append(container);
  // Lấy toàn bộ dữ liệu gương mặt của các user
  const labeledFaceDescriptors = await loadLabeledImages();
  console.log(labeledFaceDescriptors);

  // Độ chính xác 60%
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
  let image; // dang len 10 nguoi
  let canvas;
  console.log(faceMatcher);
  document.body.append("Loaded");
  imageUpload.addEventListener("change", async () => {
    if (image) image.remove();
    if (canvas) canvas.remove();

    console.log(imageUpload.files[0]);

    image = await faceapi.bufferToImage(imageUpload.files[0]);
    console.log(image);
    container.append(image);
    canvas = faceapi.createCanvasFromMedia(image);
    container.append(canvas);
    const displaySize = { width: image.width, height: image.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Xác thực các nhân vật trong ảnh chọn lên
    const detections = await faceapi
      .detectAllFaces(image)
      .withFaceLandmarks()
      .withFaceDescriptors();
    console.log(detections);

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    console.log(resizedDetections);

    // Bước nhận diện
    const results = resizedDetections.map((d) => {
      // 10 thangg

      // 4 thang
      console.log(faceMatcher.findBestMatch(d.descriptor)); // {_label: "Tony Stark", _distance: 0.5715871892946531} label => user id,
      return faceMatcher.findBestMatch(d.descriptor);
    });
    // Trả về kết quả các gương mặt quét được trong ảnh
    console.log(results);
    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: result.toString(),
      });
      drawBox.draw(canvas);
    });
  });
}

function loadLabeledImages() {
  const labels = [
    "Trinh Thang Binh",
    // "Huy2",
    "Khiem",
    "Anh Duc",
    "Tran Thanh",

    "Hariwon",
    "Thor",
    "Captain America",
    "Tony Stark",
    "Hawkeye",
  ];
  // *Tìm hiểu về Promise.all();*

  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 3; i++) {
        try {
          const img = await faceapi.fetchImage(
            `https://raw.githubusercontent.com/Trungjamin/Face-api-Javascript/master/labeled_images/${label}/${i}.jpg`
          );

          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (typeof detections !== "undefined") {
            descriptions.push(detections.descriptor);
          }
          console.log(detections);
        } catch (error) {
          console.log(error);
        }
      }
      console.log(descriptions);
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}
