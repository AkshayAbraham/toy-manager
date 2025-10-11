import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { getTypeBadgeColor } from "./colorUtils"; // <-- Import the shared utility
import "./ToyDetailsPage.css";

// Slideshow delay in milliseconds (2500ms = 2.5s)
const SLIDESHOW_DELAY = 2500;
// Pause duration in milliseconds (20000ms = 20s)
const PAUSE_DURATION = 20000;

export default function ToyDetailsPage() {
  const { toyId } = useParams();
  const navigate = useNavigate();
  const [toy, setToy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const pauseTimeoutRef = useRef(null);

  // --- Utility Functions ---

  const getAllImages = () => {
    if (!toy) return [];
    const allImages = [];
    if (toy.primary_image_url)
      allImages.push({ url: toy.primary_image_url });
    if (toy.toy_images?.length)
      toy.toy_images.forEach((img) => {
        if (img.image_url) allImages.push({ url: img.image_url });
      });
    return allImages;
  };

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not specified";

  const formatCurrency = (amt) =>
    amt
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
        }).format(amt)
      : "Not specified";

  // NOTE: The old local getTypeBadgeColor function is now REMOVED
  // and we rely entirely on the imported one.

  // --- Event Handlers ---

  const handleThumbnailClick = (index) => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    setActiveImageIndex(index);
    setIsPaused(true);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, PAUSE_DURATION);
  };
  
  const handleDeleteClick = () => {
    setShowDeleteWarning(true);
  };
  
  const executeDelete = async () => {
    setLoading(true);
    setShowDeleteWarning(false);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        alert("ERROR: You must be logged in to delete a toy.");
        setLoading(false);
        return;
    }

    const { error } = await supabase
      .from("toys")
      .delete()
      .eq("id", toyId)
      
    if (error) {
      console.error("Error deleting toy:", error);
      setLoading(false);
      alert("ERROR! Toy deletion failed: " + error.message + ". Check your Supabase RLS policies!");
    } else {
      // Success! Navigate back to the main collection page
      navigate("/");
    }
  };

  // --- Effects ---

  // Fetch toy details
  useEffect(() => {
    const fetchToyDetails = async () => {
      const { data, error } = await supabase
        .from("toys")
        .select(`
          *,
          toy_labels ( labels ( name ) ),
          toy_images ( image_url )
        `)
        .eq("id", toyId)
        .single();

      if (!error) setToy(data);
      else console.error("Error fetching toy details:", error);
      setLoading(false);
    };
    fetchToyDetails();
  }, [toyId]);

  // Auto-slideshow for images
  useEffect(() => {
    const allImages = getAllImages();

    if (allImages.length > 1 && !isPaused) {
      const interval = setInterval(() => {
        setActiveImageIndex((prev) => (prev + 1) % allImages.length);
      }, SLIDESHOW_DELAY);
      return () => clearInterval(interval);
    }
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [toy, isPaused]);

  // --- Render Logic ---

  if (loading)
    return (
      <div className="toy-page">
        <div className="toy-container">
          <div className="loading-card">
            <h2>🔄 LOADING TOY INTEL...</h2>
            <div className="loading-icon">🎮</div>
          </div>
        </div>
      </div>
    );

  if (!toy)
    return (
      <div className="toy-page">
        <div className="toy-container">
          <div className="error-card">
            <h2>🚨 MISSION FAILED!</h2>
            <p>Toy not found in the database!</p>
            <button onClick={() => navigate("/")} className="primary-btn">
              🏠 RETURN TO BASE
            </button>
          </div>
          
        </div>
      </div>
    );

  const allImages = getAllImages();
  const labels =
    toy.toy_labels?.map((tl) => tl.labels?.name).filter(Boolean) || [];

  return (
    <div className="toy-page">
      {/* 1. DELETE WARNING MODAL (Appears on top) */}
      {showDeleteWarning && (
        <div className="modal-overlay">
          <div className="delete-warning-modal">
            <h2 className="comic-warning-header">💥 STOP! DELETE CONFIRMATION! 💥</h2>
            <p className="comic-warning-message">
              Are you **absolutely sure** you want to permanently delete "{toy.name}" from your collection?
              This action **cannot** be undone!
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteWarning(false)} className="secondary-btn modal-cancel-btn">
                🚫 CANCEL
              </button>
              <button onClick={executeDelete} className="primary-btn modal-delete-btn">
                🔥 DELETE PERMANENTLY
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 2. PAGE CONTENT */}
      <header className="toy-header">
        <button onClick={() => navigate("/")} className="back-btn">
          ← BACK
        </button>
        <h1 className="toy-logo">
          <span>💥</span> ToyVerse
        </h1>
        <div style={{ width: "60px" }} />
      </header>

      <div className="toy-container">
        <div className="toy-content">
          {/* LEFT: IMAGE SECTION */}
          <div className="gallery-section">
            <div className="main-image-container">
              {allImages.length > 0 ? (
                <img
                  src={allImages[activeImageIndex].url}
                  alt={toy.name}
                  className="main-image"
                  onError={(e) =>
                    (e.target.src =
                      "https://placehold.co/400x400/ffcc00/000?text=No+Image")
                  }
                />
              ) : (
                <div className="no-image">📸 NO IMAGES AVAILABLE!</div>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="thumbnail-container">
                {allImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleThumbnailClick(idx)}
                    className={`thumbnail ${
                      idx === activeImageIndex ? "active" : ""
                    }`}
                  >
                    <img src={img.url} alt={`${toy.name} ${idx + 1}`} />
                  </div>
                ))}
              </div>
            )}
            
          </div>

          {/* RIGHT: DETAILS SECTION */}
          <div className="details-section">
            <div className="toy-title-block">
              <h2 className="toy-name">{toy.name}</h2>
              {toy.series && <p className="toy-series">📺 {toy.series}</p>}
              {toy.type && (
                <div
                  className="type-badge comic-badge"
                  style={{ backgroundColor: getTypeBadgeColor(toy.type) }}
                >
                  {toy.type.toUpperCase()}
                </div>
              )}
            </div>

            <div className="info-grid">
              <div className="info-card">
                <p className="info-label">🆔 CODE NUMBER</p>
                <p className="info-value">{toy.code_number || "N/A"}</p>
              </div>
              <div className="info-card">
                <p className="info-label">🏷️ BRAND</p>
                <p className="info-value">{toy.brand || "N/A"}</p>
              </div>
              <div className="info-card">
                <p className="info-label">⭐ CONDITION</p>
                <p className="info-value">{toy.condition || "N/A"}</p>
              </div>
              <div className="info-card">
                <p className="info-label">🎨 COLOR VARIANT</p>
                <p className="info-value">{toy.color_variant || "N/A"}</p>
              </div>
              <div className="info-card">
                <p className="info-label">📦 QUANTITY</p>
                <p className="info-value">{toy.quantity || 1}</p>
              </div>
              <div className="info-card">
                <p className="info-label">💰 PRICE</p>
                <p className="info-value">{formatCurrency(toy.price)}</p>
              </div>
            </div>

            <div className="section">
              <h3>🛒 ACQUISITION INTEL</h3>
              <div className="purchase-grid">
                <p>📅 {formatDate(toy.purchase_date)}</p>
                <p>📍 {toy.purchase_location || "Not specified"}</p>
              </div>
            </div>

            {labels.length > 0 && (
              <div className="section">
                <h3>🏷️ TAGS</h3>
                <div className="comic-tags-container">
                  {labels.map((label, i) => (
                    <div key={i} className="comic-tag">
                      <span className="comic-tag-text">#{label}</span>
                      <div className="comic-tag-sparkle">✨</div>
                      <div className="comic-tag-corner comic-tag-corner-tl"></div>
                      <div className="comic-tag-corner comic-tag-corner-tr"></div>
                      <div className="comic-tag-corner comic-tag-corner-bl"></div>
                      <div className="comic-tag-corner comic-tag-corner-br"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {toy.notes && (
              <div className="section">
                <h3>📝 NOTES</h3>
                <p className="notes">{toy.notes}</p>
              </div>
            )}

            {toy.custom_fields &&
              Object.keys(toy.custom_fields).length > 0 && (
                <div className="section">
                  <h3>🔧 CUSTOM SPECS</h3>
                  <div className="comic-specs-grid">
                    {Object.entries(toy.custom_fields).map(([key, value]) => (
                      <div key={key} className="comic-spec-card">
                        <div className="comic-spec-header">
                          <span className="comic-spec-key">⚡ {key}</span>
                          <div className="comic-connector"></div>
                        </div>
                        <div className="comic-spec-value">
                          {value}
                        </div>
                        <div className="comic-corner comic-corner-tl"></div>
                        <div className="comic-corner comic-corner-tr"></div>
                        <div className="comic-corner comic-corner-bl"></div>
                        <div className="comic-corner comic-corner-br"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="action-buttons">
              <button onClick={handleDeleteClick} className="danger-btn primary-btn">
                🗑️ DELETE TOY
              </button>
              
              <button
                onClick={() => navigate(`/edit-toy/${toyId}`)}
                className="primary-btn"
              >
                ✏️ EDIT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}