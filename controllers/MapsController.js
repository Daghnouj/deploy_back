const fetch = require("node-fetch");
/**
 * Resolve a Google Maps short link and return the full URL.
 */
const resolveMapLink = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
    });

    const resolvedUrl = response.headers.get("location");

    if (resolvedUrl) {
      res.json({ resolvedUrl });
    } else {
      res.status(400).json({ error: "Could not resolve the link." });
    }
  } catch (error) {
    console.error("Error resolving map link:", error);
    res.status(500).json({ error: "Server error." });
  }
};


module.exports = {
    resolveMapLink,
  };