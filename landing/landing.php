<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chessmates</title>
    <link rel="stylesheet" href="./landing.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
    <header>
        <nav>
            <div class="logo">
                <a href="#">
                <img src="../img/chess.png" alt="Chessmates"  class = "logoimg"></a>
                ChessMates
            </div>
            <ul class="nav-links">
                <li><a href="#">Home</a></li>
                <li><a href="../index.php">Play</a></li>
                <li><a href="#Learn">Learn</a></li>
                <li><a href="#Community">Community</a></li>
                <li><a href="#news">News</a></li>
            </ul>
            <div class="auth-buttons">
                <a href="../signin/signinform.php" class="btn btn-signin">Sign In</a>
                <a href="../signup/signuppage.php" class="btn btn-signup">Sign Up</a>
            </div>
        </nav>
    </header>

    <main>
        <section class="hero">
            <div class="hero-content">
                <h1>Master the Game of Chess</h1>
                <p>Sharpen your skills, challenge global players, and become a chess master.</p>
                <a href="../signin/signinform.php" class="btn btn-playnow">Play Now</a>
            </div>
        </section>

        

        <div class="team-component">
            <h1>TOP CHESS PLAYERS IN THE WORLD</h1>
        
            <hr>
        
            <ul class="honeycomb">
              <li class="honeycomb-cell">
                <a target="_blank" href="https://ratings.fide.com/profile/1503014">
                <img src="https://imgs.search.brave.com/pg0fHjPd0VyE2jT6AhP1KPg9UUIy4g-ouz7b9Ut9u6U/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tYWdu/dXNjYXJsc2VuLmNv/bS9zdGF0aWMvaW1n/L2Jpby9tYWdudXMt/cHJvZmlsZS5qcGc" alt="Member 1" class="honeycomb-cell_img">
                <div class="honeycomb-cell_title">Magnus Carlson</div>
               </a>
              </li>
              <li class="honeycomb-cell">
                <a target="_blank" href="https://ratings.fide.com/profile/25059530">
                <img src="https://imgs.search.brave.com/UqaM83HHMFoXcM1sikSucKV3bTntAHhxWFMMaR3ipno/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jb250/ZW50LmFwaS5uZXdz/L3YzL2ltYWdlcy9i/aW4vZjZlYjI0ZGYz/NDBjMWM2NTk2YWM5/MmZlZjRkN2VlZTc" alt="Member 2" class="honeycomb-cell_img">
                <div class="honeycomb-cell_title">pragnanandha</div>
                </a>
              </li>
              <li class="honeycomb-cell">
              <a target="_blank" href="https://ratings.fide.com/profile/46616543">
                <img src="https://imgs.search.brave.com/5cBQdgpRTyTidg7ejO4tYqvvQY19vqIcJv-Aw3mbdYQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9hcHAu/ZmlkZS5jb20vdXBs/b2FkLzI4NjM0Lzk5/MDIxOWUwNjhlM2Qx/Zjc1NGI4NDZiNzcy/OGIwZWZkLmpwZw" alt="Member 3" class="honeycomb-cell_img">
                <div class="honeycomb-cell_title">Gukesh</div>
              </a>  
              </li>
              <li class="honeycomb-cell">
              <a target="_blank" href="https://ratings.fide.com/profile/5029465">
                <img src="https://imgs.search.brave.com/9Jp8m_KqSelfbUy1uG0Moc6txbG7bOztmW37_JesY5g/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jYmlu/LmItY2RuLm5ldC9p/bWcvVkkvVmlkaXRf/MTFfMUo5RjhfNjc2/eDk2MC5qcGVn" alt="Member 3" class="honeycomb-cell_img">
                <div class="honeycomb-cell_title">Vidit</div>
               </a>
              </li>
              <!-- more team members can be added  -->
              <li class="honeycomb-cell honeycomb_Hidden"></li>
            </ul>
          </div>

        <section class="testimonial" id="Community">
            <div class="testimonial-content">
                <h2>What Our Players Say</h2>
                <p>"Chessmates has completely transformed my understanding of the game!" - Prish Keshari</p>
            </div>
            <img src="../img/prish.jpg" alt="Chess Player" class="testimonial-img">
        </section>

        <section class="review-slider">
            <div class="slider-container">
                  <div class="slider" id="review-slider"></div>
            </div>
        </section>

        
        <!-- Review Section hai-->
        <section class="add-review">
            <h2>Add Your Review</h2>
            <form action="submit_review.php" method="POST" class="review-form">
                <input type="text" name="review_name" placeholder="Enter your Name" class="text1" required>
                <textarea name="review_text" placeholder="Add your Review " class="text1" required></textarea>
                <button type="submit">Submit Review</button>
            </form>
        </section>


        <section class="featured" id="Learn">
            <div class="feature-box">
                <h3>Play Chess</h3>
                <p>Challenge friends or opponents in real-time games with instant matchmaking.</p>
            </div>
            <div class="feature-box overlap">
                <a target="_blank" href="https://youtu.be/_eBxJWRHV48?si=aXlsuAwSoj_cePw3" style="text-decoration: none;">
                    <h3>Learn Chess</h3>
                    <p>Access lessons, tutorials, and video guides to become a grandmaster.</p>
                </a>
            </div>
            <div class="feature-box">
                <a target="_blank" href="https://chessbase.in/calendar" style="text-decoration: none;">
                <h3>Upcoming Tournament</h3>
                <p>Join exciting tournaments and support your favourate chess GM.</p>
                </a>
            </div>
        </section>

        


    </main>

    <footer>
        <p>&copy; 2024 Chessmates. All rights reserved.</p>
        <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Contact</a></li>
        </ul>
    </footer>

    <script>
    fetch('./reviews.json')
        .then(response => response.json())
        .then(data => {
            const slider = document.getElementById('review-slider');
            if (data.reviews.length > 0) {
                data.reviews.forEach(review => {
                    const slide = document.createElement('div');
                    slide.classList.add('slide');
                    slide.innerHTML = `
                        <p>"${review.text}"</p>
                        <span>- ${review.name}</span>
                    `;
                    slider.appendChild(slide);
                });
            } else {
                // if no reviews, show a placeholder message
                slider.innerHTML = '<p>No reviews available yet.</p>';
            }
        })
        .catch(error => console.error('Error loading reviews:', error));

    let currentSlideIndex = 0;
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;

    function showSlide(index) {
        const slider = document.querySelector('.slider');
        if (index >= totalSlides) {
            currentSlideIndex = 0;
        } else if (index < 0) {
            currentSlideIndex = totalSlides - 1;
        } else {
            currentSlideIndex = index;
        }
        const offset = -currentSlideIndex * (slides[0].offsetWidth + 20); // 20px is the margin
        slider.style.transform = `translateX(${offset}px)`;

    }

    

    if (slides.length > 0) {
        showSlide(currentSlideIndex);
    }
</script>
</body>
</html>
