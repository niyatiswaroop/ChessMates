<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $review_text = htmlspecialchars($_POST['review_text']);
    $review_name = htmlspecialchars($_POST['review_name']);

    $reviews_file = './reviews.json';
    if (file_exists($reviews_file)) {
        $reviews_data = json_decode(file_get_contents($reviews_file), true);
    } else {
        $reviews_data = ['reviews' => []];  // initialize empty array if no reviews file exists
    }

    // add the new review to the array
    $new_review = ['text' => $review_text, 'name' => $review_name];
    $reviews_data['reviews'][] = $new_review;

    // save the updated reviews back to the JSON file
    file_put_contents($reviews_file, json_encode($reviews_data, JSON_PRETTY_PRINT));

    header('Location: landing.php');
    exit;
}
?>
