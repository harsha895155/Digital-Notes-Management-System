import { Link } from "react-router-dom";
import bg from "./Welcome.png";
function Welcome(){
    return(
        <>
                <div
  className="welcome-page"
  style={{
    backgroundImage: `url(${bg})`
  }}
>
    <div className="overlay-content">
       <h2 className="hero-title">
  Turn Thoughts Into Memories.<br />
  Keep Ideas Within Reach.
</h2>

<p className="hero-subtitle">
  Gnapika helps you capture notes, organize knowledge,
  and preserve every moment of inspiration.
</p>
       <Link
  to="/login"
  className="btn get-started-btn"
>
  Begin Your Journey
    <i className="bi bi-arrow-right ms-2"></i>
</Link>
 <div className="feature-row">
<div className="feature-box">
  <i className="bi bi-pencil-square"></i>
  <h6>Create</h6>
  <p>Capture thoughts effortlessly</p>
</div>

<div className="feature-box">
  <i className="bi bi-folder2-open"></i>
  <h6>Organize</h6>
  <p>Keep ideas beautifully arranged</p>
</div>

<div className="feature-box">
  <i className="bi bi-shield-lock"></i>
  <h6>Protect</h6>
  <p>Your notes, safe and secure</p>
</div>

        </div>
    </div>
     
</div>
        </>
    )
};

export default Welcome;