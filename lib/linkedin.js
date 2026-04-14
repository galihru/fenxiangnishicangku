const fs = require("node:fs/promises");
const { SocialMediaPublisher } = require("./social/SocialMediaPublisher");

class LinkedInPublisher extends SocialMediaPublisher {
  constructor({ accessToken, authorUrn }) {
    super({ token: accessToken });
    this.authorUrn = authorUrn;
  }

  async request({ method, url, body, headers = {} }) {
    const requestHeaders = {
      Authorization: `Bearer ${this.token}`,
      "X-Restli-Protocol-Version": "2.0.0",
      ...headers
    };

    const options = {
      method,
      headers: requestHeaders
    };

    if (body !== undefined && body !== null) {
      options.body = JSON.stringify(body);
      options.headers["Content-Type"] = "application/json";
      options.headers.Accept = "application/json";
    }

    const response = await fetch(url, options);
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`LinkedIn API error ${response.status}: ${responseText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!responseText) {
      return {
        body: {},
        headers: response.headers
      };
    }

    if (!contentType.includes("application/json")) {
      return {
        body: responseText,
        headers: response.headers
      };
    }

    return {
      body: JSON.parse(responseText),
      headers: response.headers
    };
  }

  getRecipeForKind(kind) {
    if (kind === "video") {
      return "urn:li:digitalmediaRecipe:feedshare-video";
    }
    return "urn:li:digitalmediaRecipe:feedshare-image";
  }

  async registerUpload(kind) {
    const recipe = this.getRecipeForKind(kind);
    const payload = {
      registerUploadRequest: {
        owner: this.authorUrn,
        recipes: [recipe],
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent"
          }
        ]
      }
    };

    const { body } = await this.request({
      method: "POST",
      url: "https://api.linkedin.com/v2/assets?action=registerUpload",
      body: payload
    });

    const upload = body?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"];
    const uploadUrl = upload?.uploadUrl;
    const asset = body?.value?.asset;

    if (!uploadUrl || !asset) {
      throw new Error("LinkedIn register upload did not return uploadUrl or asset URN.");
    }

    return { uploadUrl, asset };
  }

  async uploadAssetBinary({ uploadUrl, filePath, mimeType }) {
    const fileBuffer = await fs.readFile(filePath);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType
      },
      body: fileBuffer
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`LinkedIn upload failed ${response.status}: ${responseText}`);
    }
  }

  buildShareMediaCategory(mediaAssets) {
    if (!mediaAssets || mediaAssets.length === 0) {
      return "NONE";
    }

    if (mediaAssets[0].kind === "video") {
      return "VIDEO";
    }

    return "IMAGE";
  }

  async createUgcPost({ caption, mediaAssets }) {
    const shareMediaCategory = this.buildShareMediaCategory(mediaAssets);
    const media = (mediaAssets || []).map((asset) => ({
      status: "READY",
      media: asset.asset,
      title: {
        text: asset.title
      }
    }));

    const payload = {
      author: this.authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: caption
          },
          shareMediaCategory,
          media
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    const { body, headers } = await this.request({
      method: "POST",
      url: "https://api.linkedin.com/v2/ugcPosts",
      body: payload
    });

    const restliId = headers.get("x-restli-id");
    const postId = body?.id || restliId || "";

    return {
      postId,
      payload
    };
  }

  async publish({ caption, mediaAssets }) {
    const uploadedAssets = [];

    for (const mediaItem of mediaAssets || []) {
      const uploadRegistration = await this.registerUpload(mediaItem.kind);

      await this.uploadAssetBinary({
        uploadUrl: uploadRegistration.uploadUrl,
        filePath: mediaItem.filePath,
        mimeType: mediaItem.mimeType
      });

      uploadedAssets.push({
        asset: uploadRegistration.asset,
        title: mediaItem.fileName,
        kind: mediaItem.kind
      });
    }

    const postResult = await this.createUgcPost({
      caption,
      mediaAssets: uploadedAssets
    });

    return {
      postId: postResult.postId,
      uploadedAssets,
      payload: postResult.payload
    };
  }
}

module.exports = {
  LinkedInPublisher
};
