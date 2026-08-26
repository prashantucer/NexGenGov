import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# Seed dataset for Municipal Triage ML classification
# Includes English, Hindi (translated/transcribed), and Hinglish expressions.
training_data = [
    # Road Damage (PWD)
    ("severe road damage and pavement collapse", "Road Damage"),
    ("road fracture and potholes on street corner", "Road Damage"),
    ("sadak toot gayi hai aur bade gaddhe ho gaye hain", "Road Damage"),
    ("potholes are very deep and causing traffic blockage", "Road Damage"),
    ("road cracking and pavement fracture defect near school", "Road Damage"),
    ("gully school corner ke paas sadak toot gayi hai", "Road Damage"),
    ("road damage near school crossroad pavement collapse", "Road Damage"),
    ("road fracture pavement defect cracks on highway", "Road Damage"),
    ("sadak par bade potholes aur cracks ban chuke hain", "Road Damage"),
    
    # Water Supply & Sewerage (Water Supply & Sewerage Department)
    ("underground water pipeline leak sewage accumulation", "Water Supply & Sewerage"),
    ("dirty water logging and drainage overflow on main street", "Water Supply & Sewerage"),
    ("pipeline burst and water is leaking heavily", "Water Supply & Sewerage"),
    ("paani beh raha hai road par pipe leak hone ki wajah se", "Water Supply & Sewerage"),
    ("sewer manhole is overflowing with wastewater", "Water Supply & Sewerage"),
    ("drainage pipeline leak water supply pipe burst", "Water Supply & Sewerage"),
    ("underground sewer pipe rupture dirty water logs", "Water Supply & Sewerage"),
    ("paani pipe burst gully clogging sewage overflow", "Water Supply & Sewerage"),
    ("water mains pipeline leak underground pressure burst", "Water Supply & Sewerage"),

    # Waste Management (Municipal Sanitation Department)
    ("garbage accumulation and plastic waste pile", "Waste Management"),
    ("garbage pile is rotting and causing severe smell", "Waste Management"),
    ("kachra jama ho gaya hai safai nahi hui", "Waste Management"),
    ("waste dumping corner overflow and trash piling", "Waste Management"),
    ("dustbin overflow with plastic bottles and rotting waste", "Waste Management"),
    ("sanitation failure garbage accumulation on road side", "Waste Management"),
    ("kachre ke dher se badboo aa rahi hai safai karwao", "Waste Management"),
    ("street trash piling and plastic pollution garbage dumping", "Waste Management"),
    ("municipal dustbin overflows with rubbish", "Waste Management"),

    # Electricity & Streetlights (Public Works Department)
    ("broken streetlight and dark road at night", "Electricity & Streetlights"),
    ("dreaded spark on utility pole overhead wires", "Electricity & Streetlights"),
    ("street light is not working since last week", "Electricity & Streetlights"),
    ("khambe par short circuit ho gaya hai bijli nahi aa rahi", "Electricity & Streetlights"),
    ("streetlights are off causing security issues in colony", "Electricity & Streetlights"),
    ("damaged electrical post hanging wire hazard", "Electricity & Streetlights"),
    ("bijli ka khamba toot gaya hai aur taar latak rahe hain", "Electricity & Streetlights"),
    ("electric pole spark short circuit hazard on street", "Electricity & Streetlights"),
    ("colony street light is fused and broken", "Electricity & Streetlights"),
    ("street light current leak pole shock danger", "Electricity & Streetlights")
]

def train_model():
    X = [item[0] for item in training_data]
    y = [item[1] for item in training_data]

    # Create Scikit-learn Pipeline combining TF-IDF Vectorizer and Multinomial Naive Bayes
    pipeline = Pipeline([
        ('vectorizer', TfidfVectorizer(ngram_range=(1, 2), stop_words='english', lowercase=True)),
        ('classifier', MultinomialNB(alpha=0.1))
    ])

    print("Training TF-IDF + Naive Bayes Classifier on municipal dataset...")
    pipeline.fit(X, y)
    
    model_path = "municipal_classifier.joblib"
    joblib.dump(pipeline, model_path)
    print(f"Model trained successfully and serialized to '{model_path}'!")

if __name__ == "__main__":
    train_model()
