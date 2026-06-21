export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { pan } = req.query;

  if (!pan) {
    return res.status(400).json({ success: false, message: 'PAN number is required' });
  }

  const panNumber = pan.trim().toUpperCase();

  try {
    // ---------------- SPINNY ----------------
    const spinnyUrl = `https://api.spinny.com/v3/api/vehicle/full-pan-details/?pan_number=${panNumber}&source=used-car-loans`;

    const spinnyHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
      "Content-Type": "application/json",
      "anonymous-id": "1991352628.1778916165",
      "platform": "mweb_android",
      "origin": "https://www.spinny.com",
      "referer": "https://www.spinny.com/"
    };

    const spinnyCookies = "csrftoken=yEaKHxJUUUA4EdbcPBuC1UykoZ3GjtFvkBoUQqLHm3qbAL8AZmSRsZgn3P9iFlrV; sessionid=984ceyxhvgqsca4vvdmnlbpuabd64nxg; platform=mweb_android";

    const spinnyResponse = await fetch(spinnyUrl, {
      method: 'POST',
      headers: {
        ...spinnyHeaders,
        'Cookie': spinnyCookies
      },
      body: JSON.stringify({})
    });

    const spinny = await spinnyResponse.json();

    if (!spinny.ok) {
      return res.status(404).json({
        success: false,
        message: "PAN details not found"
      });
    }

    const pdata = spinny.data;

    // ---------------- DIGICREDIT ----------------
    let mobile = "";

    try {
      const digicreditUrl = "https://customer-backend.digicredit.in/onboardingRoutes/pan-validation";

      const digiHeaders = {
        "sec-ch-ua-platform": "\"Android\"",
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI4NzA5NjgzODAxIiwic2Vzc2lvbl90b2tlbiI6IjlkNDgzNjM3LTczYWMtNDI0MC1iOTI0LTU4ODhjYzc5MGVjZiIsImlhdCI6MTc3OTczNDM5OCwiZXhwIjoxNzgyMzI2Mzk4fQ.VL3I2YTs2jwejEbll-zEC4hJqiTJSZVxHemHZEWoDJM",
        "client-id": "7de19504-f422-42dc-bd51-5ed5dfb170c1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10)",
        "content-type": "application/json"
      };

      const digiPayload = {
        panNumber: panNumber,
        name: pdata.name,
        isKycTermsCheck: true
      };

      const digiResponse = await fetch(digicreditUrl, {
        method: 'POST',
        headers: digiHeaders,
        body: JSON.stringify(digiPayload)
      });

      const digi = await digiResponse.json();
      mobile = digi?.data?.mobileNo || "";
    } catch (error) {
      console.error('Digicredit API error:', error);
    }

    // ---------------- FINAL RESPONSE ----------------
    const result = {
      success: true,
      data: {
        panNumber: pdata.pan_number,
        name: pdata.name,
        personal: {
          gender: pdata.gender,
          dateOfBirth: pdata.dob,
          category: (pdata.category || "").charAt(0).toUpperCase() + (pdata.category || "").slice(1).toLowerCase(),
          type: pdata.type_of_holder
        },
        status: {
          panStatus: pdata.pan_status,
          valid: pdata.is_valid,
          aadhaarLinked: pdata.is_aadhaar_linked,
          individual: pdata.is_individual
        },
        maskedAadhaar: pdata.masked_aadhar_number,
        mobileNo: mobile
      }
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}
