class SocialMediaPublisher {
  constructor({ token }) {
    this.token = token;
  }

  async publish() {
    throw new Error("publish() must be implemented by subclass.");
  }
}

module.exports = {
  SocialMediaPublisher
};
