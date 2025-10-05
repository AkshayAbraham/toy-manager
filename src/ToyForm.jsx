import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import "./ToyForm.css";

export default function ToyForm() {
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [customFields, setCustomFields] = useState([{ key: "", value: "" }]);
  const [primaryImage, setPrimaryImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [existingAdditionalImages, setExistingAdditionalImages] = useState([]);
  const [existingPrimaryImageUrl, setExistingPrimaryImageUrl] = useState("");
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const [existingToy, setExistingToy] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tagInput, setTagInput] = useState("");

  const navigate = useNavigate();
  const { toyId } = useParams();
  const isEditMode = Boolean(toyId);

  useEffect(() => {
    const fetchLabels = async () => {
      const { data, error } = await supabase.from("labels").select("*");
      if (!error) setLabels(data);
    };

    const fetchToyData = async () => {
      if (!toyId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch toy data
        const { data: toyData, error: toyError } = await supabase
          .from("toys")
          .select("*")
          .eq("id", toyId)
          .single();

        if (toyError) throw toyError;

        setExistingToy(toyData);
        setExistingPrimaryImageUrl(toyData.primary_image_url || "");

        // Fetch labels
        const { data: toyLabels, error: labelsError } = await supabase
          .from("toy_labels")
          .select(`labels(name)`)
          .eq("toy_id", toyId);

        if (!labelsError && toyLabels) {
          const labelNames = toyLabels.map(tl => tl.labels?.name).filter(Boolean);
          setSelectedLabels(labelNames);
        }

        // Fetch additional images
        const { data: additionalImagesData, error: imagesError } = await supabase
          .from("toy_images")
          .select("image_url, id")
          .eq("toy_id", toyId);

        if (!imagesError && additionalImagesData) {
          setExistingAdditionalImages(additionalImagesData);
        }

        // Custom fields
        if (toyData.custom_fields && typeof toyData.custom_fields === 'object') {
          const fields = Object.entries(toyData.custom_fields).map(([key, value]) => ({
            key,
            value: String(value)
          }));
          setCustomFields(fields.length > 0 ? fields : [{ key: "", value: "" }]);
        }

      } catch (error) {
        console.error("Error fetching toy data:", error);
        alert("Error loading toy data");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabels();
    fetchToyData();
  }, [toyId, navigate]);

  const addCustomField = () => setCustomFields([...customFields, { key: "", value: "" }]);
  
  const handleCustomFieldChange = (index, key, value) => {
    const newFields = [...customFields];
    newFields[index] = { ...newFields[index], [key]: value };
    setCustomFields(newFields);
  };
  
  const handlePrimaryImageChange = (e) => setPrimaryImage(e.target.files[0]);
  
  const handleAdditionalImagesChange = (e) => setAdditionalImages([...additionalImages, ...Array.from(e.target.files)]);
  
  const removeAdditionalImage = (index) => setAdditionalImages(additionalImages.filter((_, i) => i !== index));

  // Improved tag handling functions
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCurrentTag();
    }
  };

  const addCurrentTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !selectedLabels.includes(newTag)) {
      setSelectedLabels([...selectedLabels, newTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setSelectedLabels(selectedLabels.filter(tag => tag !== tagToRemove));
  };

  const addTagFromSuggestion = (tag) => {
    if (!selectedLabels.includes(tag)) {
      setSelectedLabels([...selectedLabels, tag]);
    }
  };

  // Delete images from both storage and database
  const removeExistingAdditionalImage = async (imageId, imageUrl) => {
    if (!window.confirm("Are you sure you want to permanently remove this image?")) return;

    try {
      console.log("Starting image deletion for:", imageUrl);
      
      // Extract file path from URL
      let filePath = '';
      const url = new URL(imageUrl);
      const pathSegments = url.pathname.split('/');
      
      // Find the index of 'toy-images' in the path
      const toyImagesIndex = pathSegments.indexOf('toy-images');
      if (toyImagesIndex !== -1) {
        // Get everything after 'toy-images'
        filePath = pathSegments.slice(toyImagesIndex + 1).join('/');
      }

      console.log("Extracted file path:", filePath);

      if (!filePath) {
        throw new Error("Could not extract file path from image URL");
      }

      // Delete from storage
      console.log("Deleting from storage...");
      const { error: storageError } = await supabase.storage
        .from("toy-images")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue with database deletion even if storage fails
      } else {
        console.log("Storage deletion successful");
      }

      // Delete from database
      console.log("Deleting from database...");
      const { error: dbError } = await supabase
        .from("toy_images")
        .delete()
        .eq("id", imageId);

      if (dbError) {
        console.error("Database deletion error:", dbError);
        throw new Error("Failed to delete image record from database: " + dbError.message);
      }

      console.log("Database deletion successful");

      // Update local state immediately
      setExistingAdditionalImages(prev => prev.filter(img => img.id !== imageId));
      setDeletedImageIds(prev => [...prev, imageId]);

      alert("✅ Image removed successfully!");

    } catch (error) {
      console.error("Error removing image:", error);
      alert("❌ Error removing image: " + error.message);
    }
  };

  const resetForm = () => {
    setCustomFields([{ key: "", value: "" }]);
    setSelectedLabels([]);
    setPrimaryImage(null);
    setAdditionalImages([]);
    setTagInput("");
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
      navigate(isEditMode ? `/toy/${toyId}` : "/");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate primary image for new toys
      if (!isEditMode && !primaryImage) {
        alert("❌ Primary image is required!");
        setIsSubmitting(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to perform this action.");
        setIsSubmitting(false);
        return;
      }

      // Form data
      const formData = new FormData(e.target);
      const formValues = {
        name: formData.get('name') || '',
        type: formData.get('type') || '',
        series: formData.get('series') || '',
        brand: formData.get('brand') || '',
        code_number: formData.get('code_number') || '',
        quantity: parseInt(formData.get('quantity')) || 1,
        condition: formData.get('condition') || '',
        color_variant: formData.get('color_variant') || '',
        purchase_date: formData.get('purchase_date') || null,
        price: formData.get('price') ? parseFloat(formData.get('price')) : null,
        purchase_location: formData.get('purchase_location') || '',
        notes: formData.get('notes') || '',
      };

      // Prepare custom fields
      const custom_fields_json = {};
      customFields.forEach((f) => { if (f.key && f.value) custom_fields_json[f.key] = f.value; });

      let primaryImageUrl = existingPrimaryImageUrl;

      // Upload new primary image
      if (primaryImage) {
        const imagePath = isEditMode 
          ? `${toyId}/primary-${Date.now()}-${primaryImage.name}`
          : `temp/${Date.now()}-${primaryImage.name}`;

        const { error: primaryUploadError } = await supabase.storage
          .from("toy-images")
          .upload(imagePath, primaryImage);

        if (primaryUploadError) {
          alert("Error uploading primary image. Please try again.");
          setIsSubmitting(false);
          return;
        }

        const { data: primaryUrlData } = supabase.storage.from("toy-images").getPublicUrl(imagePath);
        primaryImageUrl = primaryUrlData.publicUrl;
      }

      if (isEditMode) {
        // Update toy
        const updateData = {
          ...formValues,
          custom_fields: custom_fields_json,
          updated_at: new Date().toISOString(),
        };
        if (primaryImage) updateData.primary_image_url = primaryImageUrl;

        const { error: updateError } = await supabase.from("toys").update(updateData).eq("id", toyId);
        if (updateError) {
          alert("Error updating toy: " + updateError.message);
          setIsSubmitting(false);
          return;
        }

        // Update labels
        await supabase.from("toy_labels").delete().eq("toy_id", toyId);
        for (let labelName of selectedLabels) {
          if (!labelName?.trim()) continue;
          let label = labels.find(l => l.name === labelName);
          let labelId = label?.id;
          if (!labelId) {
            const { data: newLabel } = await supabase.from("labels").insert([{ name: labelName }]).select().single();
            labelId = newLabel?.id;
          }
          if (labelId) await supabase.from("toy_labels").insert([{ toy_id: toyId, label_id: labelId }]);
        }

        // Upload new additional images
        for (let file of additionalImages) {
          const filePath = `${toyId}/additional-${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from("toy-images").upload(filePath, file);
          if (uploadError) {
            console.error("Error uploading additional image:", uploadError);
            continue;
          }
          const { data: publicUrlData } = supabase.storage.from("toy-images").getPublicUrl(filePath);
          await supabase.from("toy_images").insert([{ toy_id: toyId, image_url: publicUrlData.publicUrl }]);
        }

        alert("✅ Toy updated successfully!");
        navigate(`/toy/${toyId}`);

      } else {
        // CREATE new toy
        const insertData = {
          ...formValues,
          custom_fields: custom_fields_json,
          primary_image_url: primaryImageUrl,
          user_id: user.id,
        };
        const { data: toyData, error: toyError } = await supabase.from("toys").insert([insertData]).select().single();
        if (toyError) {
          alert("Error adding toy: " + toyError.message);
          setIsSubmitting(false);
          return;
        }
        const newToyId = toyData.id;

        // Move primary image from temp to final location if it was uploaded to temp
        if (primaryImage && primaryImageUrl.includes('temp/')) {
          const tempPath = `temp/${Date.now()}-${primaryImage.name}`;
          const newPrimaryImagePath = `${newToyId}/primary-${Date.now()}-${primaryImage.name}`;
          
          const { error: moveError } = await supabase.storage
            .from("toy-images")
            .move(tempPath, newPrimaryImagePath);

          if (!moveError) {
            const { data: newPrimaryUrlData } = supabase.storage
              .from("toy-images")
              .getPublicUrl(newPrimaryImagePath);

            await supabase
              .from("toys")
              .update({ primary_image_url: newPrimaryUrlData.publicUrl })
              .eq("id", newToyId);
          }
        }

        // Upload additional images
        for (let file of additionalImages) {
          const filePath = `${newToyId}/additional-${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from("toy-images").upload(filePath, file);
          if (uploadError) continue;
          const { data: publicUrlData } = supabase.storage.from("toy-images").getPublicUrl(filePath);
          await supabase.from("toy_images").insert([{ toy_id: newToyId, image_url: publicUrlData.publicUrl }]);
        }

        // Insert labels
        for (let labelName of selectedLabels) {
          if (!labelName?.trim()) continue;
          let label = labels.find(l => l.name === labelName);
          let labelId = label?.id;
          if (!labelId) {
            const { data: newLabel } = await supabase.from("labels").insert([{ name: labelName }]).select().single();
            labelId = newLabel?.id;
          }
          if (labelId) await supabase.from("toy_labels").insert([{ toy_id: newToyId, label_id: labelId }]);
        }

        alert("✅ Toy added successfully!");
        resetForm();
        navigate("/");
      }

    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Comic-style loading component
  if (isLoading && isEditMode) {
    return (
      <div className="toyform-page">
        <div className="toyform-container">
          <div className="comic-loading-container">
            <div className="comic-loading-card">
              <div className="comic-loading-header">
                <h2>🔄 MISSION BRIEFING IN PROGRESS...</h2>
              </div>
              
              <div className="comic-loading-content">
                <div className="comic-spinner">
                  <div className="spinner-emoji">🎮</div>
                  <div className="spinner-emoji">🎯</div>
                  <div className="spinner-emoji">🚀</div>
                  <div className="spinner-emoji">💥</div>
                </div>
                
                <div className="comic-loading-text">
                  <p className="loading-title">PREPARING TOY DATA FOR MISSION</p>
                  <p className="loading-subtitle">Loading intel from ToyVerse HQ...</p>
                </div>

                <div className="comic-progress">
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                  <div className="progress-text">DECRYPTING TOY SPECS...</div>
                </div>

                <div className="comic-tips">
                  <div className="tip-bubble">💡 TIP: Make sure all fields are filled for maximum toy power!</div>
                </div>
              </div>

              <div className="comic-loading-corners">
                <div className="corner corner-tl"></div>
                <div className="corner corner-tr"></div>
                <div className="corner corner-bl"></div>
                <div className="corner corner-br"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="toyform-page">
      <div className="toyform-container">
        <form onSubmit={handleSubmit} className="toyform-form">
          <h1 className="toyform-header">
            {isEditMode ? "✏️ MISSION UPDATE: EDIT TOY" : "💥 MISSION LOG: NEW TOY ACQUIRED 💥"}
          </h1>

          <h4 className="toyform-subheader">Primary Details</h4>
          <input name="name" placeholder="Name: Toy Name (REQUIRED)" required className="input required" defaultValue={existingToy?.name || ""}/>
          <input name="type" placeholder="Type: Funko Pop, LEGO, Figure, etc. (REQUIRED)" required className="input required" defaultValue={existingToy?.type || ""}/>
          <div className="grid-2">
            <input name="series" placeholder="Series / Franchise" className="input" defaultValue={existingToy?.series || ""}/>
            <input name="brand" placeholder="Brand / Manufacturer" className="input" defaultValue={existingToy?.brand || ""}/>
          </div>
          <div className="grid-2">
            <input name="code_number" placeholder="Code Number / SKU" className="input" defaultValue={existingToy?.code_number || ""}/>
            <input name="quantity" type="number" placeholder="Quantity (e.g., 1)" defaultValue={existingToy?.quantity || 1} min={1} className="input"/>
          </div>

          <h4 className="toyform-subheader">Condition & Variant Info</h4>
          <div className="grid-2">
            <input name="condition" placeholder="Condition (Mint, Used, Sealed)" className="input" defaultValue={existingToy?.condition || ""}/>
            <input name="color_variant" placeholder="Color / Variant" className="input" defaultValue={existingToy?.color_variant || ""}/>
          </div>

          <h4 className="toyform-subheader">Acquisition Details</h4>
          <div className="grid-2">
            <input name="purchase_date" type="date" className="input" defaultValue={existingToy?.purchase_date || ""}/>
            <input name="price" type="number" step="0.01" placeholder="Price (e.g., 25.99)" className="input" defaultValue={existingToy?.price || ""}/>
          </div>
          <input name="purchase_location" placeholder="Purchase Location (Store Name, Website)" className="input" defaultValue={existingToy?.purchase_location || ""}/>

          <h4 className="toyform-subheader">Field Notes</h4>
          <textarea name="notes" placeholder="Notes: Details on accessories, damage, or fun facts!" rows={4} className="input textarea" defaultValue={existingToy?.notes || ""}/>

          <h4 className="toyform-subheader">📸 Primary Image {!isEditMode && "(REQUIRED)"}</h4>
          <input type="file" accept="image/*" onChange={handlePrimaryImageChange} required={!isEditMode} className="input file"/>
          {existingPrimaryImageUrl && !primaryImage && (
            <div className="image-preview-block">
              <p className="image-preview-title">Current Primary Image</p>
              <div className="image-preview">
                <img src={existingPrimaryImageUrl} alt="Primary preview"/>
                <p>🏆 CURRENT PRIMARY IMAGE</p>
              </div>
            </div>
          )}
          {primaryImage && (
            <div className="image-preview-block">
              <p className="image-preview-title">{isEditMode ? "New Primary Image Selected: " : "Primary Image Selected: "} {primaryImage.name} ✅</p>
              <div className="image-preview">
                <img src={URL.createObjectURL(primaryImage)} alt="Primary preview"/>
                <p>🏆 {isEditMode ? "NEW PRIMARY IMAGE" : "PRIMARY IMAGE"}</p>
              </div>
            </div>
          )}

          <h4 className="toyform-subheader">🖼️ Additional Images (Optional)</h4>
          <input type="file" multiple accept="image/*" onChange={handleAdditionalImagesChange} className="input file"/>
          {existingAdditionalImages.length > 0 && (
            <div className="image-preview-block">
              <p className="image-preview-title">Current Additional Images</p>
              <div>
                {existingAdditionalImages.map((image, index) => (
                  <div key={image.id} className="image-preview">
                    <img src={image.image_url} alt={`Additional ${index + 1}`}/>
                    <div>
                      <button 
                        type="button" 
                        onClick={() => removeExistingAdditionalImage(image.id, image.image_url)} 
                        className="btn remove"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {additionalImages.length > 0 && (
            <div className="image-preview-block">
              <p className="image-preview-title">{additionalImages.length} new additional image(s) ready for upload! 📸</p>
              <div>
                {additionalImages.map((file, index) => (
                  <div key={index} className="image-preview">
                    <img src={URL.createObjectURL(file)} alt={`Additional preview ${index + 1}`}/>
                    <div>
                      <button type="button" onClick={() => removeAdditionalImage(index)} className="btn remove">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h4 className="toyform-subheader">Custom Specs</h4>
          {customFields.map((f, idx) => (
            <div key={idx} className="custom-field-row">
              <input placeholder="Key (e.g., 'Artist')" value={f.key} onChange={(e) => handleCustomFieldChange(idx, "key", e.target.value)} className="input"/>
              <input placeholder="Value (e.g., 'Kaws')" value={f.value} onChange={(e) => handleCustomFieldChange(idx, "value", e.target.value)} className="input"/>
              <button type="button" className="btn small remove" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addCustomField} className="btn secondary">✨ Add Custom Field</button>

          <h4 className="toyform-subheader">🏷️ Tags & Categories</h4>
          <div className="tags-input-container">
            <div className="selected-tags">
              {selectedLabels.map((tag, index) => (
                <span key={index} className="tag-pill">
                  {tag}
                  <button 
                    type="button" 
                    onClick={() => removeTag(tag)} 
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              placeholder="Type tag and press Enter or comma to add (e.g., Vinyl, Limited Edition)"
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagInputKeyDown}
              className="input"
            />
            <div className="tag-suggestions">
              <p>💡 Quick add: 
                {labels.slice(0, 6).map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    className="tag-suggestion"
                    onClick={() => addTagFromSuggestion(label.name)}
                  >
                    {label.name}
                  </button>
                ))}
              </p>
            </div>
          </div>

          <div className="button-container">
            <button type="button" onClick={handleCancel} className="btn cancel" disabled={isSubmitting}>❌ Cancel</button>
            <button type="submit" className={`btn primary ${isSubmitting ? "disabled" : ""}`} disabled={isSubmitting}>
              {isSubmitting ? "🔄 Processing..." : isEditMode ? "💾 UPDATE TOY REPORT" : "🚀 SUBMIT TOY REPORT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}