import ftp from "basic-ftp";

export async function uploadToCafe24(localFilePath, remoteFileName) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    await client.access({
      host: process.env.CAFE24_FTP_HOST,   // aitesting.mycafe24.com
      user: process.env.CAFE24_FTP_USER,   // aitesting (FTP 계정 ID)
      password: process.env.CAFE24_FTP_PASS, // FTP 비밀번호
      port: 21,
      secure: false,  // 일반 FTP
    });

    // 업로드할 디렉토리 지정
    await client.cd("/www/uploads");

    // 실제 업로드 실행
    await client.uploadFrom(localFilePath, remoteFileName);

    return `https://${process.env.CAFE24_DOMAIN}/uploads/${remoteFileName}`;
  } catch (err) {
    console.error("FTP Upload Error:", err);
    throw err;
  } finally {
    client.close();
  }
}
