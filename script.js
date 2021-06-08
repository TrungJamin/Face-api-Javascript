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
  // Cái này e chạy lần đầu, để lấy dữ diệu để chuyển đổi dữ liệu qua JSON để lưu trên Firebase
  // Các lần sau thì không cần chạy nữa.

  const labeledFaceDescriptors = await loadLabeledImages();

  // Đoạn ni là em chuyển từ labeledFaceDescriptors => về dạng JSON lưu vào labeledFaceDescriptorsJson
  // Cái ni cũng chạy lần đầu, những lần sau mình lưu đc dữ liệu trên Firebase rồi nên chỉ cần gọi về thôi chị.

  var labeledFaceDescriptorsJson = labeledFaceDescriptors.map((x) =>
    x.toJSON()
  );

  // Đoạn ni quan trọng nè chị: em chuyển các mảng trong descriptors của từng đối tượng về kiểu Object => tránh lỗi nested Arrays của
  // Firebase

  var labeledFaceDescriptorsJson = labeledFaceDescriptorsJson.map((person) => {
    // array to Object in descriptors
    person.descriptors = person.descriptors.map((detail) =>
      Object.assign({}, detail)
    );
    console.log(person);
    // "array to Object" of descriptors in Objects of array
    person.descriptors = Object.assign({}, person.descriptors);
    return person;
  });
  // console.log(telabeledFaceDescriptorsJson);

  // Ở đây em lưu dữ liệu vào JSON vào  FIREBASE sau khi chuyển đổi ở line 27
  await db.collection("DatabaseFaces").doc("10A1").set({
    data: labeledFaceDescriptorsJson,
  });
  console.log("labeledFaceDescriptorsJson: ", labeledFaceDescriptorsJson);
  // ************************************************************************************************
  // PHẦN NÀY VỀ SAU LÀ PHẦN CHỊ SẼ CHẠY CHO NHỮNG LẦN SAU, chị chỉ cần gọi dữ liệu FIREBASE VỀ THÔI.
  // không cần chạy những câu lệnh trên nữa.

  var labeledFaceDescriptorsJson2;
  await db
    .collection("FacesDatabase")
    .doc("10A1")
    .get()
    .then((doc) => {
      // console.log(doc.data());
      labeledFaceDescriptorsJson2 = doc.data().data;
      // console.log(labeledFaceDescriptorsJson2);
      labeledFaceDescriptorsJson2 = labeledFaceDescriptorsJson2.map(
        (person) => {
          //Convert Object to Array
          person.descriptors = Object.values(person.descriptors);

          // Convert Objects in person.descriptors to Arrays like the original
          person.descriptors = person.descriptors.map((detail) =>
            Object.values(detail)
          );
          return person;
        }
      );
      // console.log(labeledFaceDescriptorsJson2);
    });

  // PHẦN NÀY LÀ MẤU CHỐT: CHỊ CHUYỂN DỮ LIỆU JSON -> KIỂU DỮ LIỆU labeledFaceDescriptors ban đầu để truyền
  // vào faceapi.FaceMatcher, tránh lỗi FaceMatcher.Constructor().

  var labeledFaceDescriptors1 = labeledFaceDescriptorsJson2.map((x) =>
    faceapi.LabeledFaceDescriptors.fromJSON(x)
  );
  // console.log(labeledFaceDescriptorsJson);
  // console.log("labeledFaceDescriptors1: ", labeledFaceDescriptors1);

  // Độ chính xác 60%
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors1, 0.6);

  let image; // dang len 10 nguoi
  let canvas;

  document.body.append("Loaded");
  imageUpload.addEventListener("change", async () => {
    if (image) image.remove();
    if (canvas) canvas.remove();
    console.log(imageUpload);
    console.log(imageUpload.files);
    console.log("imageUpload.data: ", imageUpload.data);

    console.log("imageUpload.files[0]: ", imageUpload.files[0]);
    image = await faceapi.bufferToImage(imageUpload.files[0]);
    console.log("bufferToImage: ", image);

    container.append(image);
    // let img = await faceapi.fetchImage(image);
    console.log("base 64: ", image.src);
    canvas = faceapi.createCanvasFromMedia(image);

    container.append(canvas);

    const displaySize = { width: image.width, height: image.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Xác thực các nhân vật trong ảnh chọn lên
    const detections = await faceapi
      .detectAllFaces(image)
      .withFaceLandmarks()
      .withFaceDescriptors();
    console.log("detections: ", detections);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    console.log(resizedDetections);
    console.log("resizedDetections: ", resizedDetections);

    // Bước nhận diện
    const results = resizedDetections.map((d) => {
      console.log(faceMatcher.findBestMatch(d.descriptor)); // {_label: "Tony Stark", _distance: 0.5715871892946531} label => user id,
      return faceMatcher.findBestMatch(d.descriptor);
    });

    // Trả về kết quả các gương mặt quét được trong ảnh
    console.log(results);
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
    "2021010A12",
    "2021010A123",
    "2021010A124",
    "2021010A125",
    "2021010A126",
    "2021010A127",
    "2021010A128",
    "2021010A117",
    "2021010A129",
    "2021010A130",
    "2021010A131",
    "2021010A132",
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
