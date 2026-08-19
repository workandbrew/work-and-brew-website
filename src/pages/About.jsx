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
    photo: "/Team-photos/Denisse Medina F. - Founder.jpg",
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
    photo: "/Team-photos/David T. - Co-Founder.JPG",
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
    photo: null,
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
    photo: "/Team-photos/Iris - Artist Lead.jpg",
    avatar: "/strawberrymatcha.png",
    about: "Reason to join the community here.",
  },
  {
    name: "Orlando S.",
    role: "Scout (Bronx Chapter)",
    borough: "Bronx",
    occupation: "TBD",
    drink: "Iced Bodega Coffee",
    cafe: "787 Coffee @ Harlem",
    initial: "O",
    tag: "bronx-scout",
    photo: "/Team-photos/Orlando - Scout.jpg",
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
    photo: "/Team-photos/Mellanie B. - Artist Asst..jpg",
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
    photo: "/Team-photos/Christopher E. - QA Tester.png",
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
    photo: "/Team-photos/Sayraliz R. - B2B Management.jpg",
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
    photo: "/Team-photos/Jadyn - Campus Ambassador.jpg",
    avatar: "/caramelcraze.png",
    about: "Reason to join the community here.",
  },
];

const TIMELINE = [
  {
    year: "March 2025",
    title: "Work & Brew Is Born",
    text: "After two years of café-hopping across NYC, the idea becomes real during a café conversation in Fort Greene, Brooklyn.",
  },
  {
    year: "April 2025",
    title: "The Scout System",
    text: "The first borough scouts join to help verify cafés, wifi quality, seating, outlets, and work environment.",
  },
  {
    year: "May 2025",
    title: "Scouting All Five Boroughs",
    text: "Café visits ramp up across Manhattan, Brooklyn, Queens, the Bronx and Staten Island — every spot checked in person.",
  },
  {
    year: "June 2025",
    title: "Prototype Development",
    text: "Initial product planning, UX ideas, café mapping systems, and backend architecture begin development.",
  },
  {
    year: "July–Aug 2025",
    title: "Development Summer",
    text: "The verified café map takes shape — markers, café stats, and the first working build of the site.",
  },
  {
    year: "September 2025",
    title: "Community Expansion",
    text: "Work & Brew grows into more than a café platform — becoming a NYC creative and remote work community.",
  },
  {
    year: "October 2025",
    title: "The Website Goes Live",
    text: "The official Work & Brew site launches with the master café map, scouted and verified by the team.",
  },
  {
    year: "Nov–Dec 2025",
    title: "What's Next",
    text: "East Coast expansion planning begins, plus networking features and creator-friendly tools for the ecosystem.",
  },
];

export default function About() {
  const [active, setActive] = useState(0);
  const [teamVisible, setTeamVisible] = useState(false);
  const teamRef = useRef(null);

  const [timelineVisible, setTimelineVisible] = useState(false);
  const timelineRef = useRef(null);

  const [activeMilestone, setActiveMilestone] = useState(null);
  const [lastMilestone, setLastMilestone] = useState(0);

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

  return (
    <div className="page-shell">
      <Navbar />

      <div className="about-intro">
        <h1 className="page-title about-headline">
          Building Work & Brew, <br />one milestone at a time.
        </h1>
        <div className="about-hero">
          <div className="about-hero-left">
            <div className="page-badge">Our Story</div>
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
          </div>
          <div className="about-hero-right">
            <img src="/nycpicture.jpg" alt="NYC" className="about-img about-img--hero" />
          </div>
        </div>

        <div className="about-scroll-hint">
          <span className="about-scroll-label">Get to know the team &amp; our progress!</span>
          <button
            className="scroll-arrow"
            onClick={() => {
              setRevealed(true);
              const hero = document.querySelector(".about-hero");
              if (!hero) return;
              const navH = document.querySelector(".navbar")?.offsetHeight ?? 80;
              const top = hero.getBoundingClientRect().bottom + window.scrollY - navH;
              window.scrollTo({ top, behavior: "smooth" });
            }}
            aria-label="Scroll to timeline"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`timeline-section${timelineVisible ? " is-visible" : ""}${revealed ? "" : " about-blur-gate"}`}
        ref={timelineRef}
      >
        <div className="timeline-header">
          <div className="page-badge">Work &amp; Brew's Timeline</div>
        </div>

        <div className="timeline-track-wrap">
          <div className="timeline-track">
            {TIMELINE.map((item, index) => (
              <button
                key={item.year}
                className={`timeline-node ${timelineVisible ? "timeline-active" : ""} ${
                  activeMilestone === index ? "is-selected" : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => {
                  setActiveMilestone(activeMilestone === index ? null : index);
                  setLastMilestone(index);
                }}
              >
                <span className="timeline-node-dot">☕</span>
                <span className="timeline-node-date">{item.year}</span>
              </button>
            ))}
          </div>

          <div className={`timeline-detail-wrap ${activeMilestone !== null ? "is-open" : ""}`}>
            <div className="timeline-detail-clip">
              <div className="timeline-detail" key={activeMilestone ?? lastMilestone}>
                <span className="timeline-year">
                  {TIMELINE[activeMilestone ?? lastMilestone].year}
                </span>
                <h3>{TIMELINE[activeMilestone ?? lastMilestone].title}</h3>
                <p>{TIMELINE[activeMilestone ?? lastMilestone].text}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`ed-section ${teamVisible ? "is-visible" : ""}`}
        ref={teamRef}
      >
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

            <div className="kraft-name-block">
              <div className="ed-featured-tag">{TEAM[active].tag}</div>
              <h2 className="ed-featured-name">{TEAM[active].name}</h2>
              <p className="ed-featured-role">{TEAM[active].role}</p>
            </div>

            <div className="kraft-divider-dashed" />

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