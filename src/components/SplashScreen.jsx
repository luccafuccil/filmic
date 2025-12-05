import "../styles/components/SplashScreen.css";

export function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img src="assets/logo-full.png" alt="Filmic" className="splash-logo" />
        <div className="splash-loader">
          <div className="splash-loader-bar"></div>
        </div>
      </div>
    </div>
  );
}
