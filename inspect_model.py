
import joblib

import sys

try:
    model = joblib.load('models/modelo_seguridad_final2.pkl')
    print(f"Type: {type(model)}")
    
    if hasattr(model, 'classes_'):
        print(f"Classes: {model.classes_}")
    else:
        print("Classes: N/A")
        
    if hasattr(model, 'feature_names_in_'):
        print(f"Feature Names: {model.feature_names_in_}")
    else:
        print("Feature Names: N/A")

except Exception as e:
    print(f"Error: {e}")
