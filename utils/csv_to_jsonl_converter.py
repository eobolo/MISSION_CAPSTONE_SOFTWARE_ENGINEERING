"""
CBC Feedback Coach - CSV to JSONL Converter
Combines all CSV files and converts to JSONL format for FLAN-T5 training
"""

import pandas as pd
import json
import os
import glob
from pathlib import Path
import re

class CSVDatasetConverter:
    def __init__(self, csv_directory="m2_csv_file", output_file="cbc_dataset.jsonl"):
        self.csv_directory = csv_directory
        self.output_file = output_file
        self.combined_data = []
        
    def clean_text(self, text):
        """Clean and normalize text data"""
        if pd.isna(text):
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', str(text).strip())
        
        # Handle common encoding issues
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        
        return text
    
    def create_training_format(self, input_text, output_text, feedback_text):
        """Create training format for FLAN-T5"""
        # Input: The text with grammar errors
        # Output: Combined correction and feedback
        combined_output = f"CORRECTION: {output_text}\n\nFEEDBACK: {feedback_text}"
        
        return {
            "input": input_text,
            "output": combined_output
        }
    
    def process_csv_file(self, csv_file):
        """Process a single CSV file"""
        try:
            df = pd.read_csv(csv_file)
            
            # Check for required columns
            required_columns = ['Input', 'Output', 'Updated Feedback']
            if not all(col in df.columns for col in required_columns):
                print(f"Error: {csv_file} missing required columns. Found: {list(df.columns)}")
                return []
            
            processed_rows = []
            for _, row in df.iterrows():
                input_text = self.clean_text(row['Input'])
                output_text = self.clean_text(row['Output'])
                feedback_text = self.clean_text(row['Updated Feedback'])
                
                # Skip empty rows
                if not input_text or not output_text or not feedback_text:
                    continue
                
                # Create training format
                formatted_data = self.create_training_format(
                    input_text, output_text, feedback_text
                )
                processed_rows.append(formatted_data)
            
            return processed_rows
            
        except Exception as e:
            print(f"Error processing {csv_file}: {str(e)}")
            return []
    
    def combine_all_csvs(self):
        """Find and combine all CSV files in the directory"""
        csv_files = glob.glob(os.path.join(self.csv_directory, "*.csv"))
        
        if not csv_files:
            raise FileNotFoundError(f"No CSV files found in {self.csv_directory}")
        
        all_data = []
        for csv_file in csv_files:
            data = self.process_csv_file(csv_file)
            all_data.extend(data)
        
        self.combined_data = all_data
        return all_data
    
    def save_to_jsonl(self):
        """Save combined data to JSONL format"""
        if not self.combined_data:
            raise ValueError("No data to save. Run combine_all_csvs() first.")
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            for item in self.combined_data:
                json.dump(item, f, ensure_ascii=False)
                f.write('\n')
        
        file_size = os.path.getsize(self.output_file) / (1024 * 1024)  # MB
        print(f"Success: Saved {len(self.combined_data)} samples to {self.output_file} ({file_size:.2f} MB)")
    

def main():
    """Main conversion function"""
    # Initialize converter
    converter = CSVDatasetConverter()
    
    try:
        # Combine all CSV files
        converter.combine_all_csvs()
        
        # Save to JSONL
        converter.save_to_jsonl()
        
        print("Success: Conversion completed successfully!")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
