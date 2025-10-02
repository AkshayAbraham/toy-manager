import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function App() {
  const [toys, setToys] = useState([]);

  useEffect(() => {
    const fetchToys = async () => {
      let { data, error } = await supabase.from("toys").select("*");
      if (error) {
        console.error("Error fetching toys:", error);
      } else {
        console.log("Fetched toys:", data); // Check in console
        setToys(data);
      }
    };

    fetchToys();
  }, []);

  return (
    <div>
      <h1>My Toy Collection</h1>
      {toys.length === 0 ? (
        <p>No toys found</p>
      ) : (
        <ul>
          {toys.map((toy) => (
            <li key={toy.id}>{toy.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}


export default App;
