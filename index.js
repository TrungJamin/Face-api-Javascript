const imageUpload = document.getElementById("imageUpload");

Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("./models"),
]).then(start);
// Create Face Matcher
async function createFaceMatcher(data) {
  const labeledFaceDescriptors = await Promise.all(
    data.parent.map((className) => {
      const descriptors = [];
      for (var i = 0; i < className._descriptors.length; i++) {
        descriptors.push(className._descriptors[i]);
      }
      return new faceapi.LabeledFaceDescriptors(className._label, descriptors);
    })
  );
  return new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
}
async function start() {
  const container = document.createElement("div");
  container.style.position = "relative";
  document.body.append(container);
  // Lấy toàn bộ dữ liệu gương mặt của các user
  const labeledFaceDescriptors = await loadLabeledImages();

  var json_str = `{"parent":"${JSON.stringify(labeledFaceDescriptors)}"}`;
  // save the json_str to json file
  console.log(json_str);
  // Load json file and parse
  var content = JSON.parse(json_str);

  for (var x = 0; x < Object.keys(content.parent).length; x++) {
    for (
      var y = 0;
      y < Object.keys(content.parent[x]._descriptors).length;
      y++
    ) {
      var results = Object.values(content.parent[x]._descriptors[y]);
      content.parent[x]._descriptors[y] = new Float32Array(results);
    }
  }
  const faceMatcher = await createFaceMatcher(content);

  let image; // dang len 10 nguoi
  let canvas;
  // console.log(faceMatcher);
  // const obj1 = Object.assign({}, faceMatcher);
  // const obj2 = {
  //   ...faceMatcher,
  //   labeledDescriptors: Object.assign({}, faceMatcher.labeledDescriptors),
  // };
  // console.log(obj1);
  // console.log(obj2);
  // /*  await db
  //   .collection("labeledFaceDescriptors")
  //   .doc("data")
  //   .set(Object.assign({}, faceMatcher)); */

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
      console.log(faceMatcher.findBestMatch(d.descriptor)); // {_label: "Tony Stark", _distance: 0.5715871892946531} label => user id,
      return faceMatcher.findBestMatch(d.descriptor);
    });
    // Trả về kết quả các gương mặt quét được trong ảnh
    console.log(results.toString());
    console.log(results[0].label);
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
  // 10A1
  const labels = [
    "Khiem",
    "Bao Duy",
    "Han",
    "Hung Le",
    "Huynh Duc Thanh Tuan",
    "Thi Thanh",
    "Trung",
    "TruongThanhHuy",
    "Vo Trung Hieu",
    "Ngo Quoc Thinh",
    "Ho Huy",
    "Le Trung Hieu",
  ];
  // *Tìm hiểu về Promise.all();*

  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 5; i++) {
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
