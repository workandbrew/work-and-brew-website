import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { useCafes } from "../lib/cafes";
import "../components/cafe/Cafe.css";
import "./About.css";

const TEAM = [
  {
    name: "Denisse Medina Flores", first: "Denisse", role: "Founder & Product Manager", tag: "Founder",
    borough: "Queens & Lower Manhattan", occupation: "Study Skills Coach", drink: "Iced Nutella Latte", cafe: "Cup of Brooklyn",
    photo: "/Team-photos/Denisse - Founder.png",
    about: "I founded Work & Brew during a chapter of uncertainty, juggling between coding school, freelancing culinary, UGC gigs, and presenting across NYC. Cafés became my office, my sanctuary, and my community. What started as an accidental habit became a gap I couldn't ignore. I was always naturally drawn to technology but self-doubt kept me from committing, until my late coding school teacher Brian Hague changed that, leaving an imprint to believe in my ideas. Since 2022 I've been self-learning about softwares while enrolled at BloomTech, building my technical foundation from the ground up. Coming from culinary arts, content creation, and education, the pivot into tech was big but it always felt like where I was meant to end up. My real edge is thinking like a consumer, as one, myself. That instinct led me to Product Management, and Work & Brew is the proof of concept. Built from personal experience, backed by real research, and designed to fill a gap the market didn't know how to name yet.",
  },
  {
    name: "David A. Torres", first: "David", role: "Co-Founder & Backend Developer", tag: "Co-Founder",
    borough: "Remote", occupation: "Investment Analyst", drink: "Cold Brew", cafe: "Think Coffee",
    photo: "/Team-photos/David - Co-Founder.png",
    about: "I graduated from Baruch in 2025 with a BBA and a Major is Computer Information Systems, current life focus is getting AVP. I chose to be a part of work and brew to get some resume candy and elevate undervalued small business. Specifically the childhood spots that don't get enough love and get bought out by a Starbucks.",
  },
  {
    name: "Armando Bishop", first: "Armando", role: "Scout Lead", tag: "Scout Lead",
    borough: "Inwood & Washington Heights", occupation: "Part-timer at The Museum of Natural History", drink: "Americano", cafe: "Sote Coffee Roasters",
    photo: "/Team-photos/Armando - Cafe Scouts Lead.png",
    about: "Currently work part time at a museum, and excited about being a part of work & brew. I love the idea of helping small businesses grow and get recognition, and I enjoy coffee!",
  },
  {
    name: "Iris Medina", first: "Iris", role: "Scout & Artist", tag: "Artist",
    borough: "Bronx & Brooklyn", occupation: "Incoming College Freshman", drink: "Iced Mocha", cafe: "Artpresso",
    photo: "/Team-photos/Iris - Lead Artist & UX Design.png",
    about: "I want to be more open minded and adaptive to new places, even if it were to be small as a cafe. Any place could feel like a challenge to adapt in, but discovering places and experiences seems to be helpful towards to me and others. I want to make sure as long as I am discovering and seeking different cafes, I manage to help others reach their visibility as well. While I am a scout, I also manage to help and create Work & Brews Visual image, and it has been an interesting and inspiring opportunity to do so.",
  },
  {
    name: "Orlando S.", first: "Orlando", role: "Scout (Bronx Chapter)", tag: "Scout",
    borough: "Bronx", occupation: "Recent Graduate", drink: "Iced Bodega Coffee", cafe: "Greka By Montuno Coffee Inc",
    photo: "/Team-photos/Orlando - B2B Assistant.png",
    about: "Because cafes deserve more attention and should be implanted especially in the Bronx! Recent graduated pursuing a career in psychology.",
  },
  {
    name: "Mellanie Benito", first: "Mellanie", role: "Assistant Designer", tag: "Designer",
    borough: "Upper Manhattan & Queens", occupation: "Youth Counselor", drink: "Iced Coffee", cafe: "Five Flies Coffee",
    photo: "/Team-photos/Mellanie - Artist Assistant.png",
    about: "Currently a senior at CCNY , major is psychology and art education , current life focus is getting my degree , working in an art education classroom and developing new skills for a potential small side business. I chose work and brew to learn more about my area and community , try out new coffees and helping my friends small business out.",
  },
  {
    name: "Christopher Essuman", first: "Christopher", role: "QA Tester & Research", tag: "Scout",
    borough: "Brooklyn & Midtown", occupation: "Paraprofessional & College Student", drink: "Caramel Frappe", cafe: "Lakou Cafe",
    photo: "/Team-photos/Christopher - QA Tester & Comp Evaluator.png",
    about: "I'm currently pursuing my bachelor's degree in Information Systems, while working as a substitute paraprofessional. Outside of work and school, I'm actively involved in Greek life, where I enjoy community service, leadership, and building strong relationships with my fraternity brothers. Right now, my current focus is finishing school, growing my career in IT, and continuing to develop both professionally and personally. I also enjoy exploring new coffee shops and meeting new people. I joined Work & Brew to meet new people, explore different cafés, and be part of a community where people can connect, collaborate, and enjoy a good cup of coffee. Between school, work, and Greek life, it's a great way for me to unwind while continuing to grow my network.",
  },
  {
    name: "Sayraliz Rivas", first: "Sayraliz", role: "B2B Management", tag: "Copywriter",
    borough: "Brooklyn", occupation: "Visitors/Rentals at Queens Botanical Garden", drink: "Iced Latte", cafe: "Sweet Moment",
    photo: "/Team-photos/Sayraliz - B2B Management.png",
    about: "Graduated with my Bachelors last year, I chose to be part of Work and Brew because when I was in college I wish I knew about more cafes that I could use to study or just hang out with people. Gives me an experience to go outside and try new things while also connecting with others.",
  },
  {
    name: "Jadyn Loredo", first: "Jadyn", role: "College Ambassador", tag: "College Ambassador",
    borough: "Bronx & Manhattan", occupation: "Registered Behavioral Technician", drink: "Iced Caramel Latte", cafe: "Boogie Down Grind Cafe",
    photo: "/Team-photos/Jadyn - College Ambassador.png",
    about: "I choose to be apart of Work & Brew in order to help students like me who need a quiet and comfy place to study. An environment where a person is able to thrive the best while being able to access their favorite snacks and drinks without the hassle of having to go outside and look.",
  },
];

const TIMELINE = [
  { year: "Mar – Jun 2025", title: "The beginning", text: "It all started with coffee (obviously) and a lot of walking around. We visited cafés across the city, spoke with owners, and interviewed remote workers to understand what actually makes a space work friendly. At the same time, our founder began building product management fundamentals to guide the app from the ground up." },
  { year: "Summer 2025", title: "A short break", text: "Took time off for an unexpected culinary opportunity upstate. A pause that gave us the space to regroup and come back with fresh perspective." },
  { year: "Fall 2025", title: "Turning insights into action", text: "Wrapped up our café research and started documenting everything we'd learned. We identified the core problems worth solving and began mapping out solutions, while also getting hands on with the PM tools and technical setup that would power Work & Brew." },
  { year: "Winter 2025 – 26", title: "Building the skills", text: "Our founder completed a full stack coding program and took on social media management for two clients, real world experience that directly shaped how we approach content and branding for Work & Brew." },
  { year: "Spring 2026", title: "The team comes together", text: "This is when it started feeling real. Our founding team came together, roles were defined, and everyone got onboarded. Our Figma designs and brand identity, including our logo, were finalized, with documentation moving into Confluence to keep us organized." },
  { year: "Summer 2026", title: "Getting launch ready", text: "Website and app wireframes were locked in, and our technical infrastructure was finalized. We focused heavily on branding, logistics, and planning our first NYC events, alongside launching our website and setting up systems to manage business inquiries and daily operations." },
  { year: "Fall 2026", title: "We're live", text: "Work & Brew officially launches across app stores, with our social and online presence going live. Our first in person NYC events kick off, bringing our community together face to face." },
];

export default function About() {
  const { cafes } = useCafes();
  const [active, setActive] = useState(0);
  const [milestone, setMilestone] = useState(TIMELINE.length - 1);
  const member = TEAM[active];
  const boroughs = new Set(cafes.map((c) => c.borough).filter(Boolean)).size;

  return (
    <div className="story">
      <Navbar />

      {/* ── hero ── */}
      <header className="story__hero">
        <div className="story__hero-text">
          <span className="story__k">Our story</span>
          <h1 className="story__title">Made in New York City,<br />by New Yorkers.</h1>
          <p className="story__lead">
            Work &amp; Brew started in March 2025 at an independently owned café in Fort Greene, when our founder
            Denisse sat down with her best friend Sayraliz and named the thing she'd noticed for two years: the best
            work-friendly cafés in the city are independent, hidden, and slowly losing business to chains because no
            one knows they exist.
          </p>
          <p className="story__lead story__lead--soft">
            So we built a verified, human-vetted map, scouted by NYC natives who actually show up, test the Wi‑Fi,
            and tell the truth. The café map is where we start. It's not where we stop.
          </p>
          <div className="story__cta">
            <Link to="/" className="story__btn story__btn--primary">Find a café</Link>
            <a href="#team" className="story__btn">Meet the team</a>
          </div>
        </div>
        <figure className="story__hero-photo">
          <img src="/about-us-images/cafe-desktop.jpg" alt="Inside Pueblo Querido Coffee Roasters Café de Colombia" />
          <figcaption>Pueblo Querido Coffee Roasters Café de Colombia, 2026</figcaption>
        </figure>
      </header>

      {/* ── stats ── */}
      <section className="story__stats" aria-label="Work & Brew in numbers">
        <div><b>50+</b><span>mapped cafés</span></div>
        <div><b>200+</b><span>cafés scouted and counting</span></div>
        <div><b>10+</b><span>new cafés every Monday morning</span></div>
        <div><b>{boroughs || 4}</b><span>boroughs covered</span></div>
        <div><b>{TEAM.length}</b><span>team members</span></div>
      </section>

      {/* ── journey ── */}
      <section className="story__section" aria-label="Our journey">
        <div className="story__head">
          <div>
            <span className="story__k">Our journey</span>
            <h2 className="story__h2">From a café table to the app store.</h2>
          </div>
        </div>
        <div className="journey">
          <div className="journey__track" role="tablist" aria-label="Milestones">
            {TIMELINE.map((t, i) => (
              <button key={t.year} type="button" role="tab" aria-selected={milestone === i} className={`journey__node ${milestone === i ? "is-on" : ""} ${i < milestone ? "is-past" : ""}`} onClick={() => setMilestone(i)}>
                <i /><span>{t.year}</span>
              </button>
            ))}
          </div>
          <div className="journey__detail" key={milestone}>
            <span className="story__k">{TIMELINE[milestone].year}</span>
            <h3>{TIMELINE[milestone].title}</h3>
            <p>{TIMELINE[milestone].text}</p>
            <div className="journey__nav">
              <button type="button" disabled={milestone === 0} onClick={() => setMilestone((m) => m - 1)} aria-label="Previous milestone">←</button>
              <span>{milestone + 1} / {TIMELINE.length}</span>
              <button type="button" disabled={milestone === TIMELINE.length - 1} onClick={() => setMilestone((m) => m + 1)} aria-label="Next milestone">→</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── team ── */}
      <section className="story__section" id="team" aria-label="The team">
        <div className="story__head">
          <div>
            <span className="story__k">The team</span>
            <h2 className="story__h2">The people behind every listing.</h2>
          </div>
          <p className="story__sub">Tap a name to read their story.</p>
        </div>

        <div className="team">
          <div className="team__list" role="tablist" aria-label="Team members">
            {TEAM.map((m, i) => (
              <button key={m.name} type="button" role="tab" aria-selected={active === i} className={`team__item ${active === i ? "is-on" : ""}`} onClick={() => setActive(i)}>
                <img className="team__thumb" src={m.photo} alt="" loading="lazy" />
                <span className="team__item-text">
                  <span className="team__item-name">{m.first}</span>
                  <span className="team__item-role">{m.role}</span>
                </span>
              </button>
            ))}
          </div>

          <article className="receipt" key={member.name} aria-label={`${member.name}, ${member.role}`}>
            <div className="receipt__paper">
              <p className="receipt__store">WORK &amp; BREW</p>
              <p className="receipt__meta">NEW YORK CITY, NY · EST. 2025</p>
              <p className="receipt__meta">{new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })} &nbsp; TEAM MEMBER #{String(active + 1).padStart(3, "0")}</p>
              <hr className="receipt__dash" />
              <div className="receipt__photo"><img src={member.photo} alt={member.name} /></div>
              <hr className="receipt__dash" />
              <p className="receipt__tag">{member.tag.toUpperCase()}</p>
              <h3 className="receipt__name">{member.name}</h3>
              <p className="receipt__role">{member.role}</p>
              <hr className="receipt__dash" />
              <dl className="receipt__lines">
                <div><dt>1 &nbsp;BOROUGH CHAPTER</dt><dd>{member.borough}</dd></div>
                <div><dt>1 &nbsp;OCCUPATION</dt><dd>{member.occupation}</dd></div>
                <div><dt>1 &nbsp;GO-TO ORDER</dt><dd>{member.drink}</dd></div>
                <div><dt>1 &nbsp;FAVORITE SPOT</dt><dd>{member.cafe}</dd></div>
              </dl>
              <hr className="receipt__dash" />
              <p className="receipt__label">ABOUT ME</p>
              <p className="receipt__about">{member.about}</p>
              <hr className="receipt__dash" />
              <div className="receipt__total"><span>TOTAL</span><b>1 TEAM MEMBER</b></div>
              <div className="receipt__sub"><span>Paid in</span><span>coffee ☕</span></div>
              <hr className="receipt__dash" />
              <p className="receipt__thanks">THANK YOU FOR BREWING WITH US</p>
              <div className="receipt__barcode" aria-hidden="true" />
              <p className="receipt__code">WB-{String(100000 + active * 7919).slice(0, 6)}-NYC</p>
            </div>
          </article>
        </div>
      </section>

      {/* ── closing ── */}
      <section className="story__close">
        <h2 className="story__h2">Own a café? Let's talk.</h2>
        <p>We list independents only, we visit in person, and we never charge to be on the map.</p>
        <Link to="/for-owners" className="story__btn story__btn--primary">Business inquiries</Link>
      </section>

      <SiteFooter />
    </div>
  );
}
