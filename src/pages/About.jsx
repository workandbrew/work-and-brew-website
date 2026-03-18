import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import "./PageShared.css";

const TEAM = [
  {
    name: "Denisse Medina Flores",
    role: "Founder & Project/Product Manager",
    borough: "Queens & Lower Manhattan",
    occupation: "TBD",
    drink: "Iced Nutella Latte",
    cafe: "Cup of Brooklyn",
    initial: "D",
    tag: "Founder",
    photo: "/denisse.jpg",
    avatar: "/nutellalatte.png",
    about: "I founded Work & Brew during a chapter of uncertainty, juggling between coding school, freelancing culinary, UGC gigs, and presenting across NYC. Cafés became my office, my sancutary, and my community. What started as an accidental habit became a gap I couldn't ignore. I was always naturally drawn to technology but self-doubt kept me from committing, until my late coding school teacher Brian Hague changed that, leaving an imprint to believe in my ideas. Since 2022 I've been self-learning about softwares while enrolled at BloomTech, building my technical foundation from the ground up. Coming from culinary arts, content creation, and education, the pivot into tech was big but it always felt like where I was meant to end up. My real edge is thinking like a consumer, as one, myself. That instinct led me to Product Management, and Work & Brew is the proof of concept. Built from personal experience, backed by real research, and designed to fill a gap the market didn't know how to name yet.",    
  },
  {
    name: "David A. Torres",
    role: "Co-Founder & Backend Developer",
    borough: "Remote",
    occupation: "TBD",
    drink: "Cold Brew",
    cafe: "TBD",
    initial: "D",
    tag: "Co-Founder",
    avatar: "/coldbrew.png",    
    about: "Reason to join the community here.",
  },
  {
    name: "Armando Bishop",
    role: "Scout Lead",
    borough: "Inwood & Washington Heights",
    occupation: "TBD",
    drink: "Americano",
    cafe: "TBD",
    initial: "A",
    tag: "Scout Lead",
    avatar: "/americano.png",
    about: "Reason to join the community here.",
  },
  {
    name: "Iris Medina",
    role: "Scout & Artist",
    borough: "Bronx & Brooklyn",
    occupation: "TBD",
    drink: "Matcha Strawberry Latte",
    cafe: "Prince Coffee House",
    initial: "I",
    tag: "Artist",
    avatar: "/strawberrymatcha.png",
    about: "Reason to join the community here.",
  },
  {
    name: "Orlando S.",
    role: "Scout & B2B Specialist",
    borough: "Bronx",
    occupation: "TBD",
    drink: "Iced Bodega Coffee",
    cafe: "787 Coffee @ Harlem",
    initial: "O",
    tag: "B2B Management",
    avatar: "/icedcoffee2.png",
    about: "Reason to join the community here.",
  },
  {
    name: "Mellanie Benito",
    role: "Scout & Designer",
    borough: "Upper Manhattan & Queens",
    occupation: "TBD",
    drink: "Iced Bodega Coffee",
    cafe: "TBD",
    initial: "M",
    tag: "Designer",
    avatar: "/icedcoffee.png",
    about: "Reason to join the community here.",
  },
  {
    name: "Christopher Essuman",
    role: "Scout & QA",
    borough: "Brooklyn & Midtown",
    occupation: "TBD",
    drink: "Caramel Frappe",
    cafe: "TBD",
    initial: "C",
    tag: "Scout",
    photo: "/christopher.png",
    avatar: "/frappe.png",
    about: "Reason to join the community here.",
  },
  {
    name: "Sayraliz Rivas",
    role: "Brooklyn Scout & Copywriter",
    borough: "Brooklyn",
    occupation: "TBD",
    drink: "Iced Latte",
    cafe: "Sweet Moment",
    initial: "S",
    tag: "Copywriter",
    avatar: "/icedlatte.png",
    about: "Reason to join the community here.",
  },
  {
    name: "Jadyn Loredo",
    role: "Brand Rep",
    borough: "Bronx & Manhattan",
    occupation: "TBD",
    drink: "Iced Caramel Latte",
    cafe: "TBD",
    initial: "J",
    tag: "Brand Rep",
    avatar: "/caramelcraze.png",
    about: "Reason to join the community here.",
  },
];

export default function About() {
  const [active, setActive] = useState(0);
  const [teamVisible, setTeamVisible] = useState(false);
  const teamRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setTeamVisible(true);
      },
      { threshold: 0.15 }
    );
    if (teamRef.current) observer.observe(teamRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="page-shell">
      <Navbar />

      {/* About intro */}
      <div className="about-intro">
        <div className="about-intro-inner">
          <div className="about-intro-text">
            <div className="page-badge">Our Story</div>
            <h1 className="page-title">Built by NYC, <br />for NYC.</h1>
            <p className="page-body">
              Work & Brew was founded in February 2025 when Denisse — a coding student juggling
              part-time work across NYC — sat down with her best friend Sayraliz at an independently
              owned café in Fort Greene, Brooklyn. Between seminars, content creation gigs and study
              sessions, she had become great at finding work-friendly cafés across the city since 2023
              and noticed something: the best ones were independent, hidden, and slowly losing business
              to big chains simply because no one knew they existed. That gap became the mission. A
              verified, human-vetted map built by NYC natives who actually show up, test the wifi, and
              tell the truth — because finding the right spot is only half the battle. Think our WFM
              friendly cafe map finder is all we're doing? We're just getting started.
            </p>
            <p className="page-body">
              Our scouts cover all five boroughs — from high schoolers to college seniors to working
              professionals. No algorithm. No shortcuts. Just real TRUSTED people, real cafés with real stories
              and the tools to help you actually get things done.
            </p>
          </div>
          <div className="about-intro-image">
            <img src="/nycpicture.jpg" alt="NYC" className="about-img" />
          </div>
        </div>

        {/* Scroll hint + The Team badge */}
        <div className="about-scroll-hint">
          <button
            className="scroll-arrow"
              onClick={() => {
              const top = teamRef.current?.getBoundingClientRect().top + window.scrollY - 80;
              window.scrollTo({ top, behavior: "smooth" });
          }}
          aria-label="Scroll to team"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Team section */}
      <div
        className={`ed-section ${teamVisible ? "is-visible" : ""}`}
        ref={teamRef}
      >
        {/* Left - kraft paper receipt */}
          <div className="ed-featured" key={active}>
            <div className="ed-featured-top">
              <div className="page-badge">The Team</div>
            </div>
            <div className="kraft-receipt">
            <div className="kraft-header">
              <p className="kraft-store">WORK & BREW ☕</p>
              <p className="kraft-address">New York City, NY</p>
              <div className="kraft-divider-dashed" />
              <p className="kraft-order-label">TEAM MEMBER</p>
              <p className="kraft-order-num">#{String(active + 1).padStart(2, "0")}</p>
            </div>

            <div className="kraft-divider-dashed" />

            {/* Avatar */}
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

            {/* Name & role */}
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

        {/* Right - team list */}
        <div className="ed-list">
          <div className="ed-list-label">Work & Brew's Team</div>
          {TEAM.map((member, i) => (
            <button
              key={member.name}
              className={`ed-list-item ${active === i ? "is-active" : ""}`}
              onClick={() => setActive(i)}
            >
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