import os
import cv2 
import pytesseract
import time
import csv
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from concurrent.futures import ThreadPoolExecutor

# Directories
raw_images = "./data/images/raw_images"
processed_images = "./data/images/processed_images"

# Track the processed images
processed_images_array = []

# Read the image, face detection, face blurring, text recognition, text extraction
def processImage(imagePath):
    try:
        processed_images_array.append(imagePath)

        #Get image
        image = cv2.imread(imagePath) 
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)

        #Processing for image bluring
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt.xml')
        face_data = face_cascade.detectMultiScale(gray, scaleFactor=1.5, minNeighbors=2, minSize=(20, 20))
        

        #Draw rectangle around the faces
        for (x, y, w, h) in face_data: 
            cv2.rectangle(image, (x, y), (x + w, y + h), (188, 188, 188), 2) 
            roi = image[y:y+h, x:x+w] 
        
            roi = cv2.GaussianBlur(roi, (99, 99), 100) 
            image[y:y+roi.shape[0], x:x+roi.shape[1]] = roi 

        #Processing for text detection
        ret, thresh1 = cv2.threshold(gray, 0, 255,  cv2.THRESH_OTSU | cv2.THRESH_BINARY_INV) #cv2.THRESH_OTSU | cv2.THRESH_BINARY_INV ; cv2.THRESH_BINARY
        rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 20))
        dilation = cv2.dilate(thresh1, rect_kernel, iterations = 3)
        contours, hierarchy = cv2.findContours(dilation, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        image2 = image.copy()

        contours = [cnt for cnt in contours if cv2.contourArea(cnt) > 10]

        #Execute text searching
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            rect = cv2.rectangle(image2, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cropped = image2[y:y + h, x:x + w]
            
            csv_file = "./data/images/image_text/image_text.csv"

            with open(csv_file, mode="a", newline='') as file:
                writer = csv.writer(file)
            
                # Apply OCR
                text = pytesseract.image_to_string(cropped)
                formated_text = ''.join(line for line in text.splitlines() if line.strip())

                # Append the OCR result to the CSV file
                if formated_text != "" and len(formated_text) > 10:
                    writer.writerow([os.path.basename(imagePath), "\"" + formated_text + "\""])

        # Save the new image
        image_name = os.path.basename(imagePath)
        processed_image_path = os.path.join(processed_images, image_name)
        cv2.imwrite(processed_image_path, image)

        # Remove the old image
        os.remove(imagePath)

        if len(processed_images_array) > 30:
            del processed_images_array[0]


    except Exception as exc:
        print(exc)


# New image handler
class ImageHandler(FileSystemEventHandler):
    def __init__(self):
        self.thread_pool = ThreadPoolExecutor(max_workers=1)

    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith(".jpg"):
            imagePath = event.src_path  #Get the image path

            if imagePath not in processed_images_array:
                self.thread_pool.submit(processImage, imagePath)


if __name__ == "__main__":
    # Observe the raw_images folder content
    image_handler = ImageHandler()
    observer = Observer()
    observer.schedule(image_handler, path=raw_images, recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

