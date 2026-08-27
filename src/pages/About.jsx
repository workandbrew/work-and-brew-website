import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import "./PageShared.css";

const TEAM = [
  {
    name: "Denisse Medina Flores",
    role: "Founder & Project/Product Manager",
    borough: "Queens & Lower Manhattan",
    occupation: "Study Skills Coach",
    drink: "Iced Nutella Latte",
    cafe: "Cup of Brooklyn",
    initial: "D",
    tag: "Founder",
    photo: "/Team-photos/Denisse - Founder.png",
    avatar: "/about-us-images/drinks/nutellalatte.png",
    about: "I founded Work & Brew during a chapter of uncertainty, juggling between coding school, freelancing culinary, UGC gigs, and presenting across NYC. Cafés became my office, my sanctuary, and my community. What started as an accidental habit became a gap I couldn't ignore. I was always naturally drawn to technology but self-doubt kept me from committing, until my late coding school teacher Brian Hague changed that, leaving an imprint to believe in my ideas. Since 2022 I've been self-learning about softwares while enrolled at BloomTech, building my technical foundation from the ground up. Coming from culinary arts, content creation, and education, the pivot into tech was big but it always felt like where I was meant to end up. My real edge is thinking like a consumer, as one, myself. That instinct led me to Product Management, and Work & Brew is the proof of concept. Built from personal experience, backed by real research, and designed to fill a gap the market didn't know how to name yet.",
  },
  {
    name: "David A. Torres",
    role: "Co-Founder & Backend Developer",
    borough: "Remote",
    occupation: "Investment Analyst",
    drink: "Cold Brew",
    cafe: "Think Coffee",
    initial: "D",
    tag: "Co-Founder",
    photo: "/Team-photos/David - Co-Founder.png",
    avatar: "/about-us-images/drinks/coldbrew.png",
    about: "I graduated from Baruch in 2025 with a BBA and a Major is Computer Information Systems, current life focus is getting AVP. I chose to be a part of work and brew to get some resume candy and elevate undervalued small business. Specifically the childhood spots that don't get enough love and get bought out by a Starbucks.",
  },
  {
    name: "Armando Bishop",
    role: "Scout Lead",
    borough: "Inwood & Washington Heights",
    occupation: "Part-timer at The Museum of Natural History",
    drink: "Americano",
    cafe: "Sote Coffee Roasters",
    initial: "A",
    tag: "Scout Lead",
    photo: "/Team-photos/Armando - Cafe Scouts Lead.png",
    avatar: "/about-us-images/drinks/americano.png",
    about: "Currently work part time at a museum, and excited about being a part of work & brew. I love the idea of helping small businesses grow and get recognition, and I enjoy coffee!",
  },
  {
    name: "Iris Medina",
    role: "Scout & Artist",
    borough: "Bronx & Brooklyn",
    occupation: "Incoming College Freshman",
    drink: "Iced Mocha",
    cafe: "Artpresso",
    initial: "I",
    tag: "Artist",
    photo: "/Team-photos/Iris - Lead Artist & UX Design.png",
    avatar: "/about-us-images/drinks/icedmocha.png",
    about: "I want to be more open minded and adaptive to new places, even if it were to be small as a cafe. Any place could feel like a challenge to adapt in, but discovering places and experiences seems to be helpful towards to me and others. I want to make sure as long as I am discovering and seeking different cafes, I manage to help others reach their visibility as well. While I am a scout, I also manage to help and create Work & Brews Visual image, and it has been an interesting and inspiring opportunity to do so.",
  },
  {
    name: "Orlando S.",
    role: "Scout (Bronx Chapter)",
    borough: "Bronx",
    occupation: "Recent Graduate",
    drink: "Iced Bodega Coffee",
    cafe: "Greka By Montuno Coffee Inc",
    initial: "O",
    tag: "Scout",
    photo: "/Team-photos/Orlando - B2B Assistant.png",
    avatar: "/about-us-images/drinks/icedcoffee.png",
    about: "Because cafes deserve more attention and should be implanted especially in the Bronx! Recent graduated pursuing a career in psychology.",
  },
  {
    name: "Mellanie Benito",
    role: "Assistant Designer",
    borough: "Upper Manhattan & Queens",
    occupation: "Youth Counselor",
    drink: "Iced Coffee",
    cafe: "Five Flies Coffee",
    initial: "M",
    tag: "Designer",
    photo: "/Team-photos/Mellanie - Artist Assistant.png",
    avatar: "/about-us-images/drinks/icedcoffee2.png",
    about: "Currently a senior at CCNY , major is psychology and art education , current life focus is getting my degree , working in an art education classroom and developing new skills for a potential small side business. I chose work and brew to learn more about my area and community , try out new coffees and helping my friends small business out.",
  },
  {
    name: "Christopher Essuman",
    role: "QA Tester & Research",
    borough: "Brooklyn & Midtown",
    occupation: "Paraprofessional & Comakllege Student",
    drink: "Caramel Frappe",
    cafe: "Lakou Cafe",
    initial: "C",
    tag: "Scout",
    photo: "/Team-photos/Christopher - QA Tester & Comp Evaluator.png",
    avatar: "/about-us-images/drinks/frappe.png",
    about: "I'm currently pursuing my bachelor's degree in Information Systems, while working as a substitute paraprofessional. Outside of work and school, I'm actively involved in Greek life, where I enjoy community service, leadership, and building strong relationships with my fraternity brothers. Right now, my current focus is finishing school, growing my career in IT, and continuing to develop both professionally and personally. I also enjoy exploring new coffee shops and meeting new people. I joined Work & Brew to meet new people, explore different cafés, and be part of a community where people can connect, collaborate, and enjoy a good cup of coffee. Between school, work, and Greek life, it's a great way for me to unwind while continuing to grow my network.",
  },
  {
    name: "Sayraliz Rivas",
    role: "B2B Management",
    borough: "Brooklyn",
    occupation: "Visitors/Rentals at Queens Botanical Garden",
    drink: "Iced Latte",
    cafe: "Sweet Moment",
    initial: "S",
    tag: "Copywriter",
    photo: "/Team-photos/Sayraliz - B2B Management.png",
    avatar: "/about-us-images/drinks/icedlatte.png",
    about: "Graduated with my Bachelors last year, I chose to be part of Work and Brew because when I was in college I wish I knew about more cafes that I could use to study or just hang out with people. Gives me an experience to go outside and try new things while also connecting with others.",
  },
  {
    name: "Jadyn Loredo",
    role: "College Ambassador",
    borough: "Bronx & Manhattan",
    occupation: "Registered Behavioral Technician ",
    drink: "Iced Caramel Latte",
    cafe: "Boogie Down Grind Cafe",
    initial: "J",
    tag: "College Ambassador",
    photo: "/Team-photos/Jadyn - College Ambassador.png",
    avatar: "/about-us-images/drinks/caramelcraze.png",
    about: "I choose to be apart of Work & Brew in order to help students like me who need a quiet and comfy place to study. An environment where a person is able to thrive the best while being able to access their favorite snacks and drinks without the hassle of having to go outside and look.",
  },
];

const TIMELINE = [
  {
    year: "March – June 2025",
    title: "The Beginning",
    text: "It all started with coffee (obviously) and a lot of walking around. We visited cafés across the city, spoke with owners, and interviewed remote workers to understand what actually makes a space work friendly. At the same time, our founder began building product management fundamentals to guide the app from the ground up.",
  },
  {
    year: "Summer 2025",
    title: "A Short Break",
    text: "Took time off for an unexpected culinary opportunity upstate. A pause that gave us the space to regroup and come back with fresh perspective.",
  },
  {
    year: "Fall 2025",
    title: "Turning Insights Into Action",
    text: "Wrapped up our café research and started documenting everything we'd learned. We identified the core problems worth solving and began mapping out solutions, while also getting hands on with the PM tools and technical setup that would power Work & Brew.",
  },
  {
    year: "Winter 2025 to 2026",
    title: "Building the Skills",
    text: "Our founder completed a full stack coding program and took on social media management for two clients, real world experience that directly shaped how we approach content and branding for Work & Brew.",
  },
  {
    year: "Spring 2026",
    title: "The Team Comes Together",
    text: "This is when it started feeling real. Our founding team came together, roles were defined, and everyone got onboarded. Our Figma designs and brand identity, including our logo, were finalized, with documentation moving into Confluence to keep us organized.",
  },
  {
    year: "Summer 2026",
    title: "Getting Launch Ready",
    text: "Website and app wireframes were locked in, and our technical infrastructure was finalized. We focused heavily on branding, logistics, and planning our first NYC events, alongside launching our website and setting up systems to manage business inquiries and daily operations.",
  },
  {
    year: "Fall 2026",
    title: "We're Live",
    text: "Work & Brew officially launches across app stores, with our social and online presence going live. Our first in person NYC events kick off, bringing our community together face to face.",
  },
];

export default function About() {
  const [active, setActive] = useState(0);
  const [teamVisible, setTeamVisible] = useState(false);
  const teamRef = useRef(null);

  const [timelineVisible, setTimelineVisible] = useState(false);
  const timelineRef = useRef(null);

  const [activeMilestone, setActiveMilestone] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setTeamVisible(true);
      },
      { threshold: 0.15 }
    );

    const timelineObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setTimelineVisible(true);
      },
      { threshold: 0.2 }
    );

    if (teamRef.current) observer.observe(teamRef.current);
    if (timelineRef.current) timelineObserver.observe(timelineRef.current);

    return () => {
      observer.disconnect();
      timelineObserver.disconnect();
    };
  }, []);

  const scrollToTimeline = () => {
    setRevealed(true);
    if (timelineRef.current) {
      const navH = document.querySelector(".navbar")?.offsetHeight ?? 64;
      const top = timelineRef.current.getBoundingClientRect().top + window.scrollY - navH - 20;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const scrollToTeam = () => {
    setTeamVisible(true);
    if (teamRef.current) {
      const navH = document.querySelector(".navbar")?.offsetHeight ?? 64;
      const top = teamRef.current.getBoundingClientRect().top + window.scrollY - navH - 10;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="page-shell">
      <Navbar />

      {/* About Intro */}
      <div className="about-intro">
        <h1 className="page-title about-headline">
          Building Work &amp; Brew, <br />one milestone at a time.
        </h1>
        <div className="about-hero">
          <div className="about-hero-left">
            <div className="page-badge">Our Story</div>
            <p className="page-body">
              Work & Brew was founded in March 2025 when Denisse (founder), a coding student juggling
              part-time work across NYC at the time, sat down with her best friend Sayraliz at an independently
              owned café in Fort Greene, Brooklyn. Between seminars, content creation gigs and study
              sessions, she had become great at finding work-friendly cafés across the city since 2023
              and noticed something: the best ones were independent, hidden, and slowly losing business
              to big chains simply because no one knew they existed. That gap became the mission. A
              verified, human-vetted map built by NYC natives who actually show up, test the wifi, and
              tell the truth, because finding the right spot is only half the battle. Think our WFM
              friendly cafe map finder is all we're doing? We're just getting started.
            </p>
          </div>
          <div className="about-hero-right">
            <img src="/public/about-us-images/cafe-desktop.jpg" alt="NYC Coffee Spot" className="about-img about-img--hero" />
          </div>
        </div>

        {/* Scroll Hint */}
        <div className="about-scroll-hint">
          <button
            className="scroll-arrow"
            onClick={scrollToTimeline}
            aria-label="Scroll to timeline"
          >
            <span>Explore our journey &amp; team</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Timeline Section */}
      <div
        className={`timeline-section${timelineVisible ? " is-visible" : ""}${revealed ? "" : " about-blur-gate"}`}
        ref={timelineRef}
      >
        <div className="timeline-header">
          <div className="page-badge">Work &amp; Brew's Timeline</div>
        </div>

        <div className="timeline-track-wrap">
          <div className="timeline-track">
            {TIMELINE.map((item, index) => {
              const isSelected = activeMilestone === index;
              return (
                <button
                  key={item.year}
                  className={`timeline-node ${timelineVisible ? "timeline-active" : ""} ${isSelected ? "is-selected" : ""}`}
                  style={{ animationDelay: `${index * 0.08}s` }}
                  onClick={() => setActiveMilestone(index)}
                  aria-label={`View milestone for ${item.year}`}
                >
                  <div className="timeline-node-icon-wrap">
                    <svg
                      className="timeline-bear-icon"
                      viewBox="0 0 1000 1000"
                      width="28"
                      height="28"
                      fill="currentColor"
                    >
                      <path d="M 120 860 C 160 860, 200 830, 210 770 C 170 650, 180 470, 360 310 C 430 250, 520 230, 545 230 C 545 250, 510 370, 440 500 C 380 610, 420 750, 530 860 L 120 860 Z" />
                      <path d="M 570 860 C 460 740, 420 590, 480 480 C 540 370, 570 280, 570 240 C 580 190, 610 160, 660 180 C 675 190, 685 210, 700 200 C 740 180, 780 230, 840 260 C 870 275, 875 310, 835 340 C 760 400, 690 530, 685 670 C 680 770, 730 830, 840 860 L 570 860 Z" />
                      <ellipse cx="715" cy="275" rx="14" ry="18" fill="#F2E0C8" transform="rotate(-15 715 275)" />
                    </svg>
                  </div>
                  <span className="timeline-node-date">{item.year}</span>
                </button>
              );
            })}
          </div>

          {/* Smooth Expandable Milestone Box */}
          <div className="timeline-detail-box">
            <div className="timeline-detail-content" key={activeMilestone}>
              <span className="timeline-year">{TIMELINE[activeMilestone].year}</span>
              <h3>{TIMELINE[activeMilestone].title}</h3>
              <p>{TIMELINE[activeMilestone].text}</p>
            </div>
          </div>

          {/* CTA leading directly to Team Members Section */}
          <div className="timeline-team-cta-wrap">
            <button className="timeline-team-cta-btn" onClick={scrollToTeam}>
              <span>Meet the Team Members</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div
        className={`ed-section ${teamVisible ? "is-visible" : ""}`}
        ref={teamRef}
        id="team-section"
      >
        {/* Left - Kraft Paper Receipt with Member Photo */}
        <div className="ed-featured" key={active}>
          <div className="ed-featured-top">
            <div className="page-badge">The Team</div>
          </div>
          <div className="kraft-receipt">
            <div className="kraft-header">
              <p className="kraft-store">WORK &amp; BREW ☕</p>
              <p className="kraft-address">New York City, NY</p>
              <div className="kraft-divider-dashed" />
              <p className="kraft-order-label">TEAM MEMBER</p>
              <p className="kraft-order-num">#{String(active + 1).padStart(2, "0")}</p>
            </div>

            <div className="kraft-divider-dashed" />

            {/* Avatar Circle with Transparent Background & Clean Outline */}
            <div className="kraft-avatar-wrap">
              <div className="ed-featured-avatar">
                {TEAM[active].photo ? (
                  <img
                    src={TEAM[active].photo}
                    alt={TEAM[active].name}
                    className="ed-featured-photo"
                  />
                ) : (
                  <span className="ed-featured-fallback">{TEAM[active].initial}</span>
                )}
              </div>
            </div>

            <div className="kraft-divider-dashed" />

            {/* Name & Role */}
            <div className="kraft-name-block">
              <div className="ed-featured-tag">{TEAM[active].tag}</div>
              <h2 className="ed-featured-name">{TEAM[active].name}</h2>
              <p className="ed-featured-role">{TEAM[active].role}</p>
            </div>

            <div className="kraft-divider-dashed" />

            {/* Stats */}
            <div className="kraft-stats">
              <div className="kraft-stat-row">
                <span className="kraft-stat-label">BOROUGH CHAPTER</span>
                <span className="kraft-stat-val">{TEAM[active].borough}</span>
              </div>
              <div className="kraft-stat-row">
                <span className="kraft-stat-label">OCCUPATION</span>
                <span className="kraft-stat-val">{TEAM[active].occupation}</span>
              </div>
              <div className="kraft-stat-row">
                <span className="kraft-stat-label">GO-TO ORDER</span>
                <span className="kraft-stat-val">{TEAM[active].drink}</span>
              </div>
              <div className="kraft-stat-row">
                <span className="kraft-stat-label">FAVORITE SPOT</span>
                <span className="kraft-stat-val">{TEAM[active].cafe}</span>
              </div>
              <div className="kraft-about">
                <span className="kraft-about-label">ABOUT ME</span>
                <p className="kraft-about-text">{TEAM[active].about}</p>
              </div>
            </div>

            <div className="kraft-divider-dashed" />
            <p className="kraft-footer">THANK YOU FOR BREWING WITH US</p>
          </div>
        </div>

        {/* Right - Team List with Favorite Drink Covers */}
        <div className="ed-list">
          <div className="ed-list-label">Work &amp; Brew's Team</div>
          {TEAM.map((member, i) => (
            <button
              key={member.name}
              className={`ed-list-item ${active === i ? "is-active" : ""}`}
              onClick={() => setActive(i)}
            >
              {/* Favorite Drink Cover Icon */}
              <div className="ed-list-avatar">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.drink}
                    className="ed-list-avatar-img"
                  />
                ) : (
                  member.initial
                )}
              </div>
              <div className="ed-list-info">
                <span className="ed-list-name">{member.name}</span>
                <span className="ed-list-role">{member.role}</span>
              </div>
              <div className="ed-list-arrow">→</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}