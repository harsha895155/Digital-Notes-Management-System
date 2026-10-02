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
       <div className="badge bg-white text-dark shadow-sm px-3 py-2 mb-3 rounded-pill fw-semibold" style={{ letterSpacing: '0.05em' }}>
         <i className="bi bi-journal-bookmark-fill text-warning me-2"></i>
         MindDesk Platform
       </div>
       <h2 className="hero-title">
  Turn Thoughts Into Memories.<br />
  Keep Ideas Within Reach.
</h2>

<p className="hero-subtitle">
  MindDesk helps you capture notes, organize knowledge,
  and preserve every moment of inspiration.
</p>
       <div className="d-flex flex-wrap align-items-center justify-content-center gap-3 mb-4">
         <Link
           to="/login"
           className="btn get-started-btn m-0"
         >
           Begin Your Journey
           <i className="bi bi-arrow-right ms-2"></i>
         </Link>
         <a
           href="mailto:minddesk43@gmail.com"
           className="btn btn-outline-light rounded-pill px-4 py-2"
           style={{ border: '1px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }}
         >
           <i className="bi bi-envelope-fill me-2"></i>
           minddesk43@gmail.com
         </a>
       </div>
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