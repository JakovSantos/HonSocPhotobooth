import { useState, useEffect } from "react";
import { Photobooth } from "./components/Photobooth";
import { SharedPhoto } from "./components/SharedPhoto";

export function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => window.location.pathname);

  // Listen to popstate for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check if current route is a public photo sharing URL: /photo/:id
  if (currentRoute.startsWith("/photo/")) {
    const photoId = currentRoute.replace("/photo/", "").replace(/\/$/, "");
    return (
      <SharedPhoto
        id={photoId}
        onGoBack={() => {
          window.history.pushState({}, "", "/");
          setCurrentRoute("/");
        }}
      />
    );
  }

  // Default: Main AUF CCS Honor Society Photobooth flow
  return <Photobooth />;
}

export default App;
