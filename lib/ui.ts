import { createSystem } from "frog/ui";

export const { Box, Columns, Column, Image, Heading, Text, VStack, Spacer, vars } = createSystem({
  colors: {
    white: "white",
    black: "rgb(10,9,13)",
    purple: "rgb(98,18,236)",
    blue: "rgb(0,82,255)",
    red: "rgb(253,39,74)",
    grey: 'rgb(135,134,139)',
  },
  fonts: {
    default: [
      {
        name: "Long Cang",
        source: "google",
        weight: 400,
      }
    ],
  },
});