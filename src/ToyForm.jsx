import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ToyForm() {
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [customFields, setCustomFields] = useState([{ key: "", value: "" }]);
  const [primaryImage, setPrimaryImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Fetch existing labels
  useEffect(() => {
    const fetchLabels = async () => {
      const { data, error } = await supabase.from("labels").select("*");
      if (!error) setLabels(data);
    };
    fetchLabels();
  }, []);

  // Add custom field input
  const addCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  // Update custom field input
  const handleCustomFieldChange = (index, key, value) => {
    const newFields = [...customFields];
    newFields[index] = { ...newFields[index], [key]: value };
    setCustomFields(newFields);
  };

  // Handle primary image selection
  const handlePrimaryImageChange = (e) => {
    const file = e.target.files[0];
    setPrimaryImage(file);
  };

  // Handle additional images selection
  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files);
    setAdditionalImages([...additionalImages, ...files]);
  };

  // Remove additional image
  const removeAdditionalImage = (index) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  };

  // Submit form - FIXED VERSION
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate primary image
      if (!primaryImage) {
        alert("❌ Primary image is required! Please select a main image for your toy.");
        setIsSubmitting(false);
        return;
      }

      // Build JSON for custom fields
      const custom_fields_json = {};
      customFields.forEach((f) => {
        if (f.key) custom_fields_json[f.key] = f.value;
      });

      // ✅ FIRST: Upload the primary image to get its URL
      const primaryImagePath = `temp/${Date.now()}-${primaryImage.name}`;
      const { error: primaryUploadError } = await supabase.storage
        .from("toy-images")
        .upload(primaryImagePath, primaryImage);

      if (primaryUploadError) {
        console.error("Primary image upload error:", primaryUploadError.message);
        alert("Error uploading primary image. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Get public URL for primary image
      const { data: primaryUrlData } = supabase.storage
        .from("toy-images")
        .getPublicUrl(primaryImagePath);

      const primaryImageUrl = primaryUrlData.publicUrl;

      // ✅ NOW: Insert toy WITH the primary image URL
      const { data: toyData, error: toyError } = await supabase
        .from("toys")
        .insert([
          {
            name: e.target.name.value,
            type: e.target.type.value,
            series: e.target.series.value,
            code_number: e.target.code_number.value,
            purchase_date: e.target.purchase_date.value,
            purchase_location: e.target.purchase_location.value,
            price: e.target.price.value,
            brand: e.target.brand.value,
            condition: e.target.condition.value,
            color_variant: e.target.color_variant.value,
            quantity: e.target.quantity.value,
            notes: e.target.notes.value,
            custom_fields: custom_fields_json,
            primary_image_url: primaryImageUrl, // ✅ Now included in the initial insert
          },
        ])
        .select()
        .single();

      if (toyError) {
        // Clean up the uploaded image if toy insertion fails
        await supabase.storage.from("toy-images").remove([primaryImagePath]);
        alert("Error adding toy: " + toyError.message);
        setIsSubmitting(false);
        return;
      }

      const toyId = toyData.id;

      // ✅ Move the primary image to the correct toy folder
      const newPrimaryImagePath = `${toyId}/primary-${Date.now()}-${primaryImage.name}`;
      const { data: moveData, error: moveError } = await supabase.storage
        .from("toy-images")
        .move(primaryImagePath, newPrimaryImagePath);

      if (moveError) {
        console.error("Error moving primary image:", moveError);
        // Continue anyway, the image is already uploaded
      } else {
        // Update the toy with the new path if move was successful
        const { data: newPrimaryUrlData } = supabase.storage
          .from("toy-images")
          .getPublicUrl(newPrimaryImagePath);

        await supabase
          .from("toys")
          .update({ primary_image_url: newPrimaryUrlData.publicUrl })
          .eq("id", toyId);
      }

      // ✅ Upload ADDITIONAL IMAGES
      for (let file of additionalImages) {
        const filePath = `${toyId}/additional-${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("toy-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Additional image upload error:", uploadError.message);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("toy-images")
          .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        // Save additional image URL in toy_images table
        await supabase.from("toy_images").insert([
          { 
            toy_id: toyId, 
            image_url: publicUrl 
          }
        ]);
      }

      // Handle labels
      for (let labelName of selectedLabels) {
        if (!labelName) continue;
        let label = labels.find((l) => l.name === labelName);
        let labelId = label?.id;

        if (!labelId) {
          const { data: newLabel } = await supabase
            .from("labels")
            .insert([{ name: labelName }])
            .select()
            .single();
          labelId = newLabel.id;
        }

        await supabase.from("toy_labels").insert([{ toy_id: toyId, label_id: labelId }]);
      }

      alert("✅ Toy added successfully with images!");

      // Reset form and redirect
      e.target.reset();
      setCustomFields([{ key: "", value: "" }]);
      setSelectedLabels([]);
      setPrimaryImage(null);
      setAdditionalImages([]);
      navigate("/");

    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
      navigate("/");
    }
  };

  // --- UI STYLES (same as before) ---

  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#fffbe6",
    padding: "20px",
    fontFamily: "'Comic Sans MS', cursive, sans-serif",
  };

  const containerStyle = {
    maxWidth: "800px",
    margin: "0 auto",
  };

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    padding: "25px",
    backgroundColor: "#fff",
    border: "4px solid #000",
    borderRadius: "16px",
    boxShadow: "8px 8px 0 #000",
  };

  const headerStyle = {
    fontFamily: "'Bangers', cursive",
    fontSize: "clamp(28px, 6vw, 42px)",
    color: "#ff4d4d",
    textShadow: "2px 2px 0 #000",
    marginBottom: "10px",
    textAlign: 'center',
  };

  const subHeaderStyle = {
    fontFamily: "'Bangers', cursive",
    fontSize: "clamp(20px, 4vw, 28px)",
    color: "#000",
    borderBottom: '3px dashed #ff4d4d',
    paddingBottom: '5px',
    marginBottom: '15px',
    marginTop: '25px',
  };

  const inputBaseStyle = {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "3px solid #000",
    fontSize: "16px",
    fontFamily: "'Comic Sans MS', cursive, sans-serif",
    boxShadow: "3px 3px 0 #000",
    width: "100%",
    boxSizing: 'border-box',
  };

  const requiredFieldStyle = {
    ...inputBaseStyle,
    borderColor: "#ff4d4d",
    backgroundColor: "#fff0f0"
  };

  const buttonStyle = {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "3px solid #000",
    fontSize: "16px",
    fontFamily: "'Comic Sans MS', cursive, sans-serif",
    cursor: "pointer",
    fontWeight: "bold",
    transition: 'all 0.1s',
    boxShadow: "4px 4px 0 #000",
    marginTop: '10px',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#ffcc00",
    color: "#000",
    fontSize: '18px',
    padding: '14px 20px',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#33ccff",
    color: "#000",
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#ff6b6b",
    color: "#000",
  };

  const removeButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#ff4d4d",
    color: "#fff",
    padding: '5px 10px',
    fontSize: '12px',
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginTop: '20px',
  };

  const imagePreviewStyle = {
    display: 'inline-block',
    margin: '5px',
    padding: '5px',
    border: '2px solid #000',
    borderRadius: '8px',
    backgroundColor: '#fff',
  };

  // --- JSX RENDER ---

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <form onSubmit={handleSubmit} style={formStyle}>
          <h1 style={headerStyle}>
            <span role="img" aria-label="boom">💥</span> MISSION LOG: NEW TOY ACQUIRED <span role="img" aria-label="boom">💥</span>
          </h1>

          {/* Main Details */}
          <h4 style={subHeaderStyle}>Primary Details</h4>
          <input name="name" placeholder="Name: Toy Name (REQUIRED)" required style={requiredFieldStyle} />
          <input name="type" placeholder="Type: Funko Pop, LEGO, Figure, etc. (REQUIRED)" required style={requiredFieldStyle} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input name="series" placeholder="Series / Franchise" style={inputBaseStyle} />
            <input name="brand" placeholder="Brand / Manufacturer" style={inputBaseStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input name="code_number" placeholder="Code Number / SKU" style={inputBaseStyle} />
            <input name="quantity" type="number" placeholder="Quantity (e.g., 1)" defaultValue={1} min={1} style={inputBaseStyle} />
          </div>

          {/* Condition & Variants */}
          <h4 style={subHeaderStyle}>Condition & Variant Info</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input name="condition" placeholder="Condition (Mint, Used, Sealed)" style={inputBaseStyle} />
            <input name="color_variant" placeholder="Color / Variant" style={inputBaseStyle} />
          </div>
          
          {/* Purchase Details */}
          <h4 style={subHeaderStyle}>Acquisition Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input name="purchase_date" type="date" style={inputBaseStyle} />
            <input name="price" type="number" step="0.01" placeholder="Price (e.g., 25.99)" style={inputBaseStyle} />
          </div>
          <input name="purchase_location" placeholder="Purchase Location (Store Name, Website)" style={inputBaseStyle} />
          
          {/* Notes */}
          <h4 style={subHeaderStyle}>Field Notes</h4>
          <textarea name="notes" placeholder="Notes: Details on accessories, damage, or fun facts!" rows={4} style={{...inputBaseStyle, resize: 'vertical'}} />

          {/* PRIMARY IMAGE (Required) */}
          <h4 style={subHeaderStyle}>
            <span role="img" aria-label="camera">📸</span> Primary Image (REQUIRED)
          </h4>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handlePrimaryImageChange} 
            required
            style={{...requiredFieldStyle, padding: '10px', height: 'auto'}}
          />
          {primaryImage && (
            <div style={{marginTop: '10px'}}>
              <p style={{fontSize: '14px', color: '#000', fontWeight: 'bold'}}>
                Primary Image Selected: {primaryImage.name} ✅
              </p>
              <div style={imagePreviewStyle}>
                <img 
                  src={URL.createObjectURL(primaryImage)} 
                  alt="Primary preview" 
                  style={{maxWidth: '200px', maxHeight: '200px', border: '2px solid #ffcc00'}}
                />
                <p style={{textAlign: 'center', margin: '5px 0 0 0', fontSize: '12px'}}>
                  🏆 PRIMARY IMAGE
                </p>
              </div>
            </div>
          )}

          {/* ADDITIONAL IMAGES (Optional) */}
          <h4 style={subHeaderStyle}>
            <span role="img" aria-label="images">🖼️</span> Additional Images (Optional)
          </h4>
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleAdditionalImagesChange} 
            style={{...inputBaseStyle, padding: '10px', height: 'auto'}}
          />
          {additionalImages.length > 0 && (
            <div style={{marginTop: '10px'}}>
              <p style={{fontSize: '14px', color: '#000', fontWeight: 'bold'}}>
                {additionalImages.length} additional image(s) ready for upload! 📸
              </p>
              <div>
                {additionalImages.map((file, index) => (
                  <div key={index} style={imagePreviewStyle}>
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Additional preview ${index + 1}`} 
                      style={{maxWidth: '150px', maxHeight: '150px'}}
                    />
                    <div style={{textAlign: 'center', marginTop: '5px'}}>
                      <button 
                        type="button" 
                        onClick={() => removeAdditionalImage(index)}
                        style={removeButtonStyle}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Fields */}
          <h4 style={subHeaderStyle}>Custom Specs</h4>
          {customFields.map((f, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px', gap: '10px', alignItems: 'center' }}>
              <input
                placeholder="Key (e.g., 'Artist')"
                value={f.key}
                onChange={(e) => handleCustomFieldChange(idx, 'key', e.target.value)}
                style={inputBaseStyle}
              />
              <input
                placeholder="Value (e.g., 'Kaws')"
                value={f.value}
                onChange={(e) => handleCustomFieldChange(idx, 'value', e.target.value)}
                style={inputBaseStyle}
              />
              <button 
                type="button" 
                style={{
                  ...buttonStyle, 
                  background: '#ff4d4d', 
                  padding: '8px', 
                  fontSize: '18px',
                  height: '44px'
                }}
                onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          ))}
          <button 
            type="button" 
            onClick={addCustomField} 
            style={secondaryButtonStyle}
          >
            <span role="img" aria-label="sparkle">✨</span> Add Custom Field
          </button>

          {/* Labels */}
          <h4 style={subHeaderStyle}>Tags & Categories</h4>
          <input
            placeholder="Comma-separated labels (e.g., Vinyl, Limited Edition, Exclusive)"
            value={selectedLabels.join(", ")}
            onChange={(e) => setSelectedLabels(e.target.value.split(",").map((l) => l.trim()))}
            style={inputBaseStyle}
          />
          {labels.length > 0 && (
            <p style={{fontSize: '12px', margin: '-10px 0 0 0', color: '#666'}}>
              Existing: {labels.slice(0, 5).map(l => l.name).join(', ')}{labels.length > 5 ? '...' : ''}
            </p>
          )}

          {/* Button Container */}
          <div style={buttonContainerStyle}>
            <button 
              type="button" 
              onClick={handleCancel}
              style={cancelButtonStyle}
              disabled={isSubmitting}
            >
              <span role="img" aria-label="cancel">❌</span> Cancel
            </button>
            <button 
              type="submit" 
              style={{
                ...primaryButtonStyle,
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "🔄 Uploading..."
              ) : (
                <>
                  <span role="img" aria-label="send">🚀</span> SUBMIT TOY REPORT
                </>
              )}
            </button>
          </div>

          {/* Additional CSS for responsive design */}
          <style>{`
            @media (max-width: 768px) {
              div[style*="gridTemplateColumns"] {
                grid-template-columns: 1fr !important;
              }
              
              .button-container {
                flex-direction: column;
              }
            }
            
            button:active:not(:disabled) {
              transform: translate(2px, 2px);
              box-shadow: 2px 2px 0 #000 !important;
            }
          `}</style>
        </form>
      </div>
    </div>
  );
}