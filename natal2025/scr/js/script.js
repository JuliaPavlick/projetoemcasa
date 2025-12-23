const gift = document.getElementById("gift");
const timeline = document.getElementById("timeline");
const slides = document.querySelectorAll(".slide");

gift.addEventListener("click", () => {
  const tl = gsap.timeline();

  tl.to(".lid", {
    y: -120,
    rotation: 20,
    duration: 0.6,
    ease: "power2.out"
  })
  .to(".gift", {
    scale: 1.5,
    opacity: 0,
    duration: 0.6
  })
  .add(() => {
    gift.style.display = "none";
    timeline.style.display = "block";
  })
  .fromTo(
    slides,
    { opacity: 0, y: 50 },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 2
    }
  );
});