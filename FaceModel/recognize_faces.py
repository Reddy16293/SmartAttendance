import os
import cv2
import numpy as np
import pickle
from pathlib import Path
from face_encoder import FaceEncoder

EMBEDDINGS_FOLDER = "embeddings"
OUTPUT_FOLDER = "recognized_outputs"

class FaceRecognizer:
    def __init__(self):
        self.encoder = FaceEncoder()
        self.threshold = 0.6  # Similarity threshold (0-1), lower = stricter matching
        
    def load_all_embeddings(self):
        """Load all person embeddings from pickle file"""
        master_file = os.path.join(EMBEDDINGS_FOLDER, "all_embeddings.pkl")
        
        if not os.path.exists(master_file):
            print(f"❌ Master embeddings file not found: {master_file}")
            print(f"   Run generate_embeddings.py first!")
            return None
        
        try:
            with open(master_file, 'rb') as f:
                embeddings_dict = pickle.load(f)
            
            print(f"✅ Loaded {len(embeddings_dict)} embeddings from {master_file}\n")
            return embeddings_dict
        
        except Exception as e:
            print(f"❌ Error loading embeddings: {str(e)}")
            return None
    
    def calculate_similarity(self, embedding1, embedding2):
        """Calculate cosine similarity between two embeddings"""
        # Normalize embeddings
        e1 = embedding1 / np.linalg.norm(embedding1)
        e2 = embedding2 / np.linalg.norm(embedding2)
        
        # Cosine similarity
        similarity = np.dot(e1, e2)
        return max(0, similarity)  # Ensure non-negative
    
    def recognize_from_file(self, image_path, embeddings_dict, top_k=1):
        """Recognize face from image file"""
        if not os.path.exists(image_path):
            print(f"❌ Image not found: {image_path}")
            return None
        
        # Read image
        img = cv2.imread(image_path)
        
        if img is None:
            print(f"❌ Could not read image: {image_path}")
            return None
        
        recognized_faces, annotated_img = self.recognize_faces_in_image(img, embeddings_dict, top_k)
        return {
            "recognized_faces": recognized_faces,
            "annotated_img": annotated_img,
            "original_img": img,
        }

    def recognize_faces_in_image(self, img, embeddings_dict, top_k=1):
        """Recognize all faces in an image and return labeled output data"""
        if img is None:
            print("❌ No image provided")
            return [], None

        faces = self.encoder.detect_faces(img)

        if len(faces) == 0:
            print("⚠️  No face detected in image")
            return [], img.copy()

        annotated_img = img.copy()
        recognized_faces = []

        for idx, face in enumerate(faces, 1):
            detected_embedding = self.encoder.l2_normalize(face.embedding)

            similarities = {}
            for person_name, stored_embedding in embeddings_dict.items():
                similarity = self.calculate_similarity(detected_embedding, stored_embedding)
                similarities[person_name] = similarity

            sorted_results = sorted(similarities.items(), key=lambda x: x[1], reverse=True)
            best_name, best_similarity = sorted_results[0]

            if best_similarity >= self.threshold:
                label = f"{best_name} ({best_similarity:.2%})"
                matched_name = best_name
            else:
                label = f"Unknown ({best_similarity:.2%})"
                matched_name = "Unknown"

            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox
            cv2.rectangle(annotated_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                annotated_img,
                label,
                (x1, max(0, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.0,
                (0, 255, 0),
                3,
            )

            recognized_faces.append(
                {
                    "face_index": idx,
                    "name": matched_name,
                    "best_similarity": float(best_similarity),
                    "top_matches": sorted_results[:top_k],
                }
            )

        return recognized_faces, annotated_img

    def save_annotated_image(self, image_path, annotated_img):
        """Save recognized image with labels and return output path"""
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)
        image_name = Path(image_path).stem
        output_path = os.path.join(OUTPUT_FOLDER, f"{image_name}_recognized.jpg")
        cv2.imwrite(output_path, annotated_img)
        return output_path
    
    def recognize_from_image(self, img, embeddings_dict, top_k=1):
        """Recognize face from OpenCV image"""
        if img is None:
            print("❌ No image provided")
            return None
        
        # Get faces from image
        faces = self.encoder.detect_faces(img)
        
        if len(faces) == 0:
            print("⚠️  No face detected in image")
            return None
        
        # Get embedding of detected face
        detected_embedding = self.encoder.l2_normalize(faces[0].embedding)
        
        # Calculate similarity with all stored embeddings
        similarities = {}
        for person_name, stored_embedding in embeddings_dict.items():
            similarity = self.calculate_similarity(detected_embedding, stored_embedding)
            similarities[person_name] = similarity
        
        # Sort by similarity (descending)
        sorted_results = sorted(similarities.items(), key=lambda x: x[1], reverse=True)
        
        # Filter by threshold
        valid_results = [(name, sim) for name, sim in sorted_results if sim >= self.threshold]
        
        if not valid_results:
            print(f"⚠️  No match found (best match: {sorted_results[0][0]} with {sorted_results[0][1]:.2%} similarity)")
            return None
        
        # Return top_k results
        results = valid_results[:top_k]
        
        return results
    
    def recognize_from_folder(self, folder_path, embeddings_dict, top_k=1):
        """Recognize faces from all images in a folder"""
        if not os.path.exists(folder_path):
            print(f"❌ Folder not found: {folder_path}")
            return {}
        
        valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif'}
        image_files = [
            f for f in os.listdir(folder_path)
            if Path(f).suffix.lower() in valid_extensions
        ]
        
        results = {}
        
        print(f"🔍 Recognizing faces in {len(image_files)} images...\n")
        
        for img_file in image_files:
            img_path = os.path.join(folder_path, img_file)
            
            print(f"📷 {img_file}:")
            
            try:
                recognition_output = self.recognize_from_file(img_path, embeddings_dict, top_k)

                if not recognition_output:
                    results[img_file] = None
                    print(f"   ⚠️  No match found")
                    print()
                    continue

                recognized_faces = recognition_output["recognized_faces"]
                annotated_img = recognition_output["annotated_img"]

                if len(recognized_faces) == 0:
                    results[img_file] = []
                    print("   ⚠️  No faces detected")
                else:
                    results[img_file] = recognized_faces
                    output_path = self.save_annotated_image(img_path, annotated_img)
                    print(f"   ✅ Faces detected: {len(recognized_faces)}")
                    for face_data in recognized_faces:
                        print(
                            f"      Face-{face_data['face_index']}: {face_data['name']} "
                            f"({face_data['best_similarity']:.2%})"
                        )
                    print(f"   💾 Saved labeled image: {output_path}")
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
                results[img_file] = None
            
            print()
        
        return results
    
    def set_threshold(self, threshold):
        """Set similarity threshold (0-1)"""
        if 0 <= threshold <= 1:
            self.threshold = threshold
            print(f"✅ Similarity threshold set to {threshold:.0%}")
        else:
            print(f"❌ Threshold must be between 0 and 1")

def main():
    """Example usage"""
    print("="*50)
    print("🎯 Face Recognition System")
    print("="*50 + "\n")
    
    # Initialize recognizer
    recognizer = FaceRecognizer()
    recognizer.set_threshold(0.6)  # Adjust this value: higher = stricter
    
    # Load embeddings
    embeddings_dict = recognizer.load_all_embeddings()
    
    if embeddings_dict is None:
        return
    
    # Recognize a single image
    print("\n" + "="*50)
    print("Single image recognition")
    print("="*50)
    test_image_path = "group5.jpg"  # Change this to your image name

    print(f"\nImage: {test_image_path}")
    if os.path.exists(test_image_path):
        output = recognizer.recognize_from_file(test_image_path, embeddings_dict, top_k=3)
        if not output:
            print("No results for this image")
        else:
            recognized_faces = output["recognized_faces"]
            annotated_img = output["annotated_img"]

            if len(recognized_faces) == 0:
                print("No faces detected")
            else:
                output_path = recognizer.save_annotated_image(test_image_path, annotated_img)
                print(f"Detected faces: {len(recognized_faces)}")
                print("Recognized names:")
                for face_data in recognized_faces:
                    print(
                        f"  Face-{face_data['face_index']}: {face_data['name']} "
                        f"({face_data['best_similarity']:.2%})"
                    )
                print(f"Saved labeled image: {output_path}")

                # Try OpenCV window first; fall back to OS image viewer when highgui is unavailable.
                try:
                    cv2.imshow("Recognition Result", annotated_img)
                    print("\nPress any key in the image window to close...")
                    cv2.waitKey(0)
                    cv2.destroyAllWindows()
                except cv2.error:
                    absolute_output_path = os.path.abspath(output_path)
                    print("\nOpenCV GUI is not available in this environment.")
                    print(f"Opening image using default viewer: {absolute_output_path}")
                    try:
                        os.startfile(absolute_output_path)
                    except OSError as e:
                        print(f"Could not auto-open image: {e}")
                        print(f"Please open manually: {absolute_output_path}")
    else:
        print(f"Test image not found: {test_image_path}")
    
    print("\n" + "="*50)
    print("✅ Recognition complete!")
    print("="*50)

if __name__ == "__main__":
    main()
