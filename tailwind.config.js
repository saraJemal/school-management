/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors:{
        saraSky:"#C3EBFA",
        saraSkyLight:"#EDF9FD",
        saraPurple:"#CFCEFF",
        saraPurpleLight:"#F1F0FF",
        saraYellow:"#FAE27C",
        saraYellowLight:"#FEFCEB",
        badirBlack:"#000022",
        badirYellow:"#ffc701",
        badirStar:"#d1c20b",
        badirBlue:"#013567",
        badirRed:"#f10505",
      },
    },
  },
  plugins: [],
};

