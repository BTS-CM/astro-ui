import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

export default function WaveHero({ title, subtitle, className = "" }) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const heading = title || t("Home:waveHero.title");
  const sub = subtitle || t("Home:waveHero.subtitle");

  return (
    <div
      className={`relative mb-5 min-h-[420px] flex items-center ${className}`}
    >
      <svg
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-full w-[110vw]"
        viewBox="0 0 2000 600"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="waveGrad4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="waveGrad5" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.5" />
          </linearGradient>
          <filter
            id="blur-strong"
            x="-200"
            y="-200"
            width="2400"
            height="1000"
            filterUnits="userSpaceOnUse"
          >
            {/* much lighter blur so thin strands remain crisp */}
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <linearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="black" />
            <stop offset="20%" stopColor="white" />
            <stop offset="80%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </linearGradient>
          <mask id="fadeBandMask">
            <rect x="0" y="0" width="2000" height="600" fill="url(#fadeY)" />
          </mask>
        </defs>

        <g
          filter="url(#blur-strong)"
          strokeLinecap="round"
          mask="url(#fadeBandMask)"
        >
          {/* thinner, spaghetti-like strands */}
          <path
            d="M0 320 C 250 200 500 440 750 320 S 1250 200 1500 320 S 2000 440 2000 320"
            stroke="url(#waveGrad2)"
            strokeWidth="14"
            fill="none"
            opacity="0.65"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-120 4; 120 -4; -120 4"
              dur="36s"
              repeatCount="indefinite"
            />
          </path>

          <path
            d="M0 350 C 260 240 540 460 820 350 S 1380 240 1640 350 S 2000 460 2000 350"
            stroke="url(#waveGrad3)"
            strokeWidth="15"
            fill="none"
            opacity="0.5"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="100 -6; -100 6; 100 -6"
              dur="44s"
              repeatCount="indefinite"
            />
          </path>

          <path
            d="M0 380 C 220 300 440 520 660 380 S 1100 300 1320 380 S 1760 520 2000 380"
            stroke="url(#waveGrad1)"
            strokeWidth="13"
            fill="none"
            opacity="0.55"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-90 6; 90 -6; -90 6"
              dur="50s"
              repeatCount="indefinite"
            />
          </path>

          <path
            d="M0 300 C 240 200 480 360 720 300 S 1200 200 1440 300 S 1920 360 2000 300"
            stroke="url(#waveGrad4)"
            strokeWidth="11"
            fill="none"
            opacity="0.5"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="140 3; -140 -3; 140 3"
              dur="52s"
              repeatCount="indefinite"
            />
          </path>

          <path
            d="M0 420 C 260 340 520 560 780 420 S 1300 340 1560 420 S 2080 560 2000 420"
            stroke="url(#waveGrad5)"
            strokeWidth="16"
            fill="none"
            opacity="0.45"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-140 -5; 140 5; -140 -5"
              dur="58s"
              repeatCount="indefinite"
            />
          </path>

          {/* extra thin strands for spaghetti look */}
          <path
            d="M0 340 C 200 260 400 460 600 340 S 1000 260 1200 340 S 1600 460 2000 340"
            stroke="url(#waveGrad1)"
            strokeWidth="7"
            fill="none"
            opacity="0.35"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-60 2; 60 -2; -60 2"
              dur="30s"
              repeatCount="indefinite"
            />
          </path>

          <path
            d="M0 360 C 180 280 360 480 540 360 S 960 280 1140 360 S 1560 480 2000 360"
            stroke="url(#waveGrad3)"
            strokeWidth="6"
            fill="none"
            opacity="0.32"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="80 -3; -80 3; 80 -3"
              dur="34s"
              repeatCount="indefinite"
            />
          </path>

          {/* duplicated thinner strands (offsets + varied durations) to double density */}
          <path
            d="M0 330 C 250 210 500 430 750 330 S 1250 210 1500 330 S 2000 430 2000 330"
            stroke="url(#waveGrad2)"
            strokeWidth="12"
            fill="none"
            opacity="0.5"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-100 3; 100 -3; -100 3"
              dur="40s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M0 370 C 260 250 540 450 820 370 S 1380 250 1640 370 S 2000 450 2000 370"
            stroke="url(#waveGrad3)"
            strokeWidth="10"
            fill="none"
            opacity="0.42"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="90 -4; -90 4; 90 -4"
              dur="46s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M0 395 C 220 310 440 510 660 395 S 1100 310 1320 395 S 1760 510 2000 395"
            stroke="url(#waveGrad1)"
            strokeWidth="11"
            fill="none"
            opacity="0.45"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-80 5; 80 -5; -80 5"
              dur="52s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M0 310 C 240 210 480 350 720 310 S 1200 210 1440 310 S 1920 350 2000 310"
            stroke="url(#waveGrad4)"
            strokeWidth="9"
            fill="none"
            opacity="0.4"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="130 2; -130 -2; 130 2"
              dur="50s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M0 430 C 260 350 520 540 780 430 S 1300 350 1560 430 S 2080 540 2000 430"
            stroke="url(#waveGrad5)"
            strokeWidth="8"
            fill="none"
            opacity="0.36"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-120 -4; 120 4; -120 -4"
              dur="62s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M0 345 C 200 265 400 455 600 345 S 1000 265 1200 345 S 1600 455 2000 345"
            stroke="url(#waveGrad1)"
            strokeWidth="6"
            fill="none"
            opacity="0.28"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-50 2; 50 -2; -50 2"
              dur="32s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </svg>

      <div className="relative z-0 mx-auto w-full max-w-4xl px-4 text-center flex flex-col items-center justify-center gap-2 mt-6">
        <h1 className="scroll-m-20 text-4xl sm:text-5xl font-extrabold tracking-tight text-balance text-white [text-shadow:_0_1px_10px_rgba(0,0,0,0.35)]">
          {heading}
        </h1>
        <h2 className="scroll-m-20 text-2xl sm:text-3xl font-semibold tracking-tight text-white [text-shadow:_0_1px_10px_rgba(0,0,0,0.35)]">
          {sub}
        </h2>
      </div>
    </div>
  );
}
