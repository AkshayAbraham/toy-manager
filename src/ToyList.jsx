import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function ToyList() {
  const [toys, setToys] = useState([]);

  useEffect(() => {
    const fetchToys = async () => {
      const { data, error } = await supabase
        .from("toys")
        .select(`
          id,
          name,
          created_at,
          toy_images ( image_url )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching toys:", error);
        return;
      }

      const toysWithImages = data.map((toy) => ({
        id: toy.id,
        name: toy.name,
        image: toy.toy_images?.[0]?.image_url || null, // show first image only
      }));

      setToys(toysWithImages);
    };

    fetchToys();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
        background: "linear-gradient(135deg, #ff4d4d, #ffd633, #33ccff)",
        backgroundSize: "400% 400%",
        animation: "gradientShift 12s ease infinite",
      }}
    >
      <h2
        style={{
          fontFamily: "'Bangers', 'Comic Sans MS', cursive, sans-serif",
          fontSize: "clamp(28px, 6vw, 40px)",
          color: "#fff",
          textAlign: "center",
          marginBottom: "20px",
          textShadow: "3px 3px 0 #000",
        }}
      >
        🧸 My Toy Collection
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "16px",
        }}
      >
        {toys.map((toy) => (
          <div
            key={toy.id}
            style={{
              background: "#fffbe6",
              border: "3px solid #000",
              borderRadius: "16px",
              boxShadow: "6px 6px 0 #000",
              padding: "10px",
              textAlign: "center",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-3px, -3px)";
              e.currentTarget.style.boxShadow = "10px 10px 0 #000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translate(0,0)";
              e.currentTarget.style.boxShadow = "6px 6px 0 #000";
            }}
          >
            {toy.image ? (
              <img
                src={toy.image}
                alt={toy.name}
                style={{
                  width: "100%",
                  height: "140px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  border: "2px solid #000",
                  marginBottom: "10px",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "140px",
                  borderRadius: "12px",
                  border: "2px dashed #000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Bangers', cursive",
                  fontSize: "14px",
                  color: "#000",
                  marginBottom: "10px",
                }}
              >
                No Image
              </div>
            )}
            <h3
              style={{
                fontFamily: "'Bangers', 'Comic Sans MS', cursive, sans-serif",
                fontSize: "clamp(16px, 4vw, 20px)",
                margin: 0,
                color: "#000",
              }}
            >
              {toy.name}
            </h3>
          </div>
        ))}
      </div>

      {/* Comic-style animated gradient background */}
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
    </div>
  );
}
