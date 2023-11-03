import os
import cv2 
import matplotlib.pyplot as plt
import pytesseract
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

row_images = "data/images/row_images"
processed_images = "data/images/processed_images"


def showImage(img): 
    plt.imshow(img, cmap="gray") 
    plt.axis('off') 
    plt.style.use('ggplot') 
    plt.show() 
  
def processImage(imagePath):
    try:
        #Get image
        image = cv2.imread(imagePath) 
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        #Processing for image bluring
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt.xml')
        face_data = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=1, minSize=(40, 40))

        #Draw rectangle around the faces
        for (x, y, w, h) in face_data: 
            cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 2) 
            roi = image[y:y+h, x:x+w] 
        
            roi = cv2.GaussianBlur(roi, (23, 23), 30) 
            image[y:y+roi.shape[0], x:x+roi.shape[1]] = roi 
        

        #Processing for text detection
        ret, thresh1 = cv2.threshold(gray, 0, 255, cv2.THRESH_OTSU | cv2.THRESH_BINARY_INV)
        rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (60, 60))
        dilation = cv2.dilate(thresh1, rect_kernel, iterations = 1)
        contours, hierarchy = cv2.findContours(dilation, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        image2 = image.copy()

        #Execute text searching
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            
            rect = cv2.rectangle(image2, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cropped = image2[y:y + h, x:x + w]
            
            file = open("image_text.txt", "a")

            # Apply OCR
            text = pytesseract.image_to_string(cropped)
            formated_text = '\n'.join(line for line in text.splitlines() if line.strip())

            # Appending the text into file
            if formated_text != "":
                file.write(formated_text)
                file.write("\n")
            file.close

        # Save the new image
        image_name = os.path.basename(imagePath)
        processed_image_path = os.path.join(processed_images, image_name)
        cv2.imwrite(processed_image_path, image)

        # Remove the old image
        os.remove(imagePath)

        #showImage(image) 
    except Exception as exc:
        print(exc)


class ImageHandler(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith(".jpg"):
            imagePath = event.src_path
            processImage(imagePath)


if __name__ == "__main__":
    image_handler = ImageHandler()
    observer = Observer()
    observer.schedule(image_handler, path=row_images, recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

    # processImage('/Users/dionisbarcari/Documents/raspberryPi/server/data/images/row_images/90671759-group-of-people-holding-a-banner.jpg')
