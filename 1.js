console.log("1.js");
const constraints = {
    audio: false,
    //video: { width: 640, height: 360 }
    video: true
};

photo = document.getElementById('photo');

navigator.mediaDevices.getUserMedia(constraints)
    .then(function(mediaStream) {
        const video = document.createElement('video');
        document.body.appendChild(video);
        video.srcObject = mediaStream;
        video.onloadedmetadata = function(e) {
            video.play();
        };
        
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        document.body.appendChild(canvas);

        const button = document.createElement('button');
        button.innerText = 'Take photo';
        document.body.appendChild(button);
        button.onclick = function() {
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataURL = canvas.toDataURL('image/jpeg');
            console.log(dataURL);
            
            const div = document.createElement("div");
            const textNode = document.createTextNode("photo done");
            div.appendChild(textNode);
            document.body.appendChild(div);
            photo.setAttribute("src",dataURL);

        };
    })
    .catch(function(err) {
        console.log('Error: ' + err);
    });
