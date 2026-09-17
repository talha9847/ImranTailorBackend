const { google } = require("googleapis");
const { Readable } = require("stream");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

async function uploadToDrive(file, orderId, photoType) {
  if (!file) {
    return null;
  }

  try {
    const extension = file.originalname.split(".").pop() || "jpg";

    const fileName = `ORDER_${orderId}_${photoType.toUpperCase()}.${extension}`;

    console.log("Uploading:", fileName);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },

      media: {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      },

      fields: "id,name,mimeType",
    });

    const fileId = response.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: {
        type: "anyone",
        role: "reader",
      },
    });

    // Store only the Google Drive file ID
    return fileId;
  } catch (error) {
    console.error(
      "Google Drive upload error:",
      error.response?.data || error.message,
    );

    throw error;
  }
}

const getFileIdFromUrl = (fileUrl) => {
  if (!fileUrl) {
    return null;
  }

  try {
    const url = new URL(fileUrl);

    const id = url.searchParams.get("id");

    if (id) {
      return id;
    }

    const match = fileUrl.match(/\/d\/([^/]+)/);

    return match ? match[1] : null;
  } catch {
    return null;
  }
};

function getDrivePhotoUrls(fileId) {
  if (!fileId) {
    return null;
  }

  return {
    id: fileId,

    thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`,

    preview: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,

    url: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
}

const deleteFromDrive = async (fileUrl) => {
  if (!fileUrl) {
    return;
  }

  try {
    const fileId = getFileIdFromUrl(fileUrl);

    if (!fileId) {
      console.log("Could not extract Drive file ID:", fileUrl);
      return;
    }

    console.log("Deleting Google Drive file:", fileId);

    await drive.files.delete({
      fileId,
    });

    console.log("Google Drive file deleted:", fileId);
  } catch (error) {
    console.error(
      "Google Drive delete error:",
      error.response?.data || error.message,
    );

    throw error;
  }
};

const getDriveFile = async (fileId) => {
  if (!fileId) {
    throw new Error("File ID is required");
  }

  return drive.files.get(
    {
      fileId,
      alt: "media",
    },
    {
      responseType: "stream",
    },
  );
};

module.exports = {
  uploadToDrive,
  deleteFromDrive,
  getDriveFile,
};
