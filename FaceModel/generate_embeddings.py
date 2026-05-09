import os
import cv2
import numpy as np
import pickle
import logging
from pathlib import Path
from tqdm import tqdm
from face_encoder import FaceEncoder

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('embedding_generation.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create embeddings folder if it doesn't exist
EMBEDDINGS_FOLDER = "embeddings1"
if not os.path.exists(EMBEDDINGS_FOLDER):
    os.makedirs(EMBEDDINGS_FOLDER)
    logger.info(f"Created embeddings folder: {EMBEDDINGS_FOLDER}")

class EmbeddingGenerator:
    def __init__(self, dataset_path="dataset"):
        self.dataset_path = dataset_path
        self.encoder = FaceEncoder()
        self.embeddings_dict = {}
        
    def get_image_paths(self, person_folder):
        """Get all image paths from a person's folder"""
        valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif'}
        image_paths = []
        
        for file in os.listdir(person_folder):
            if Path(file).suffix.lower() in valid_extensions:
                image_paths.append(os.path.join(person_folder, file))
        
        return image_paths
    
    def encode_person(self, person_folder_path, person_name):
        """Generate embeddings for a person from all their images"""
        image_paths = self.get_image_paths(person_folder_path)
        
        if not image_paths:
            logger.warning(f"No images found for {person_name} in {person_folder_path}")
            return None, 0, 0
        
        logger.info(f"Starting encoding for {person_name}")
        logger.info(f"Found {len(image_paths)} images")
        
        embeddings = []
        valid_count = 0
        face_detected_count = 0
        
        print(f"  Processing {len(image_paths)} images for {person_name}...")
        
        for idx, img_path in enumerate(tqdm(image_paths, desc=f"  {person_name}", leave=False), 1):
            try:
                logger.debug(f"[{idx}/{len(image_paths)}] Processing {Path(img_path).name}")
                
                # Read image from file
                img = cv2.imread(img_path)
                
                if img is None:
                    logger.warning(f"Could not read image: {img_path}")
                    continue
                
                logger.debug(f"Image loaded: {img.shape}")
                
                # Get faces from image
                faces = self.encoder.detect_faces(img)
                logger.debug(f"Face detection result: {len(faces)} face(s) detected")
                
                if len(faces) == 0:
                    logger.warning(f"No face detected in {Path(img_path).name}")
                    continue
                
                face_detected_count += 1
                logger.info(f"Face detected in {Path(img_path).name}")
                
                # L2 normalize the embedding
                embedding = self.encoder.l2_normalize(faces[0].embedding)
                embeddings.append(embedding)
                valid_count += 1
                
                logger.debug(f"Embedding generated: shape={embedding.shape}")
                
            except Exception as e:
                logger.error(f"Error processing {img_path}: {str(e)}")
                continue
        
        if not embeddings:
            logger.error(f"No valid faces found for {person_name}")
            logger.info(f"Summary for {person_name}: Faces detected in 0/{len(image_paths)} images")
            return None, face_detected_count, len(image_paths)
        
        # Calculate average embedding
        avg_embedding = np.mean(embeddings, axis=0)
        
        logger.info(f"{person_name}: Processed {valid_count}/{len(image_paths)} images successfully")
        logger.info(f"Faces detected: {face_detected_count}/{len(image_paths)}")
        logger.info(f"Average embedding generated: shape={avg_embedding.shape}")
        
        print(f"  ✅ {person_name}: Faces detected in {face_detected_count}/{len(image_paths)} images")
        
        return avg_embedding, face_detected_count, len(image_paths)
    
    def generate_all_embeddings(self):
        """Generate embeddings for all persons in dataset folder"""
        if not os.path.exists(self.dataset_path):
            logger.error(f"Dataset folder not found: {self.dataset_path}")
            print(f"❌ Dataset folder not found: {self.dataset_path}")
            return False
        
        logger.info(f"Dataset folder found: {self.dataset_path}")
        
        person_folders = [
            d for d in os.listdir(self.dataset_path)
            if os.path.isdir(os.path.join(self.dataset_path, d))
        ]
        
        if not person_folders:
            logger.error(f"No person folders found in {self.dataset_path}")
            print(f"❌ No person folders found in {self.dataset_path}")
            return False
        
        logger.info(f"Found {len(person_folders)} person folders to process")
        logger.info(f"Folders: {', '.join(person_folders)}")
        
        print(f"\n🚀 Starting embedding generation for {len(person_folders)} persons...\n")
        
        success_count = 0
        failed_persons = []
        total_faces_detected = 0
        total_images = 0
        
        for idx, person_name in enumerate(person_folders, 1):
            person_folder_path = os.path.join(self.dataset_path, person_name)
            
            logger.info(f"[{idx}/{len(person_folders)}] Processing: {person_name}")
            print(f"📁 Processing: {person_name}")
            
            avg_embedding, faces_detected, num_images = self.encode_person(person_folder_path, person_name)
            
            total_images += num_images
            total_faces_detected += faces_detected
            
            if avg_embedding is not None:
                try:
                    # Save individual embedding file
                    embedding_file = os.path.join(EMBEDDINGS_FOLDER, f"{person_name}.pkl")
                    
                    with open(embedding_file, 'wb') as f:
                        pickle.dump(avg_embedding, f)
                    
                    logger.info(f"Saved embedding to file: {embedding_file}")
                    print(f"  💾 Saved to {embedding_file}\n")
                    
                    # Also store in memory
                    self.embeddings_dict[person_name] = avg_embedding
                    
                    success_count += 1
                    
                except Exception as e:
                    logger.error(f"Error saving embedding for {person_name}: {str(e)}")
                    failed_persons.append(person_name)
                    print()
            else:
                failed_persons.append(person_name)
                print()
        
        # Save master embeddings file
        try:
            master_file = os.path.join(EMBEDDINGS_FOLDER, "all_embeddings.pkl")
            with open(master_file, 'wb') as f:
                pickle.dump(self.embeddings_dict, f)
            
            logger.info(f"Saved master embeddings file: {master_file}")
            print(f"\n💾 Master embeddings file saved: {master_file}")
        except Exception as e:
            logger.error(f"Error saving master embeddings file: {str(e)}")
        
        # Summary
        logger.info("="*50)
        logger.info(f"Embedding generation complete!")
        logger.info(f"Successfully processed: {success_count} persons")
        logger.info(f"Failed: {len(failed_persons)} persons")
        logger.info(f"Total images processed: {total_images}")
        logger.info(f"Total faces detected: {total_faces_detected}")
        
        if failed_persons:
            logger.warning(f"Failed persons: {', '.join(failed_persons)}")
        
        logger.info("="*50)
        
        print("\n" + "="*50)
        print(f"✅ Embedding generation complete!")
        print(f"📊 Statistics:")
        print(f"   - Successfully processed: {success_count} persons")
        print(f"   - Failed: {len(failed_persons)} persons")
        print(f"   - Total images: {total_images}")
        print(f"   - Total faces detected: {total_faces_detected}")
        
        if failed_persons:
            print(f"\n⚠️  Failed persons:")
            for name in failed_persons:
                print(f"   - {name}")
        
        print("="*50 + "\n")
        
        return success_count > 0

if __name__ == "__main__":
    logger.info("="*50)
    logger.info("Face Embedding Generation Started")
    logger.info("="*50)
    
    try:
        generator = EmbeddingGenerator(dataset_path="dataset")
        success = generator.generate_all_embeddings()
        
        if success:
            logger.info("Embedding generation completed successfully")
        else:
            logger.warning("Embedding generation completed with errors")
    
    except Exception as e:
        logger.error(f"Fatal error during embedding generation: {str(e)}", exc_info=True)
        raise
    
    finally:
        logger.info("="*50)
        logger.info("Process finished")
        logger.info("="*50)
