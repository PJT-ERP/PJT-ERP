import React from "react";
import { renderToString } from "react-dom/server";
import { ProductionPage } from "./src/app/pages/ProductionPage";
import { AppProvider } from "./src/app/components/context/AppContext";

try {
    const element = React.createElement(AppProvider, null, React.createElement(ProductionPage));
    renderToString(element);
    console.log("RENDER SUCCESS!");
} catch (e) {
    console.error("RENDER CRASH:", e);
}
