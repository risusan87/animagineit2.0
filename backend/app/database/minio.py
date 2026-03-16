
import os
import boto3
from botocore.client import Config
from io import BytesIO

class MinioStorage:
    def __init__(self):
        self.bucket_name = os.getenv("MINIO_BUCKET_NAME")
        self.s3_client = boto3.client(
            's3',
            endpoint_url="http://minio:9000",
            aws_access_key_id=os.getenv("MINIO_ROOT_USER"),
            aws_secret_access_key=os.getenv("MINIO_ROOT_PASSWORD"),
            config=Config(signature_version='s3v4'),
            region_name="docker"
        )

    def upload_image(self, image_bytes: bytes, filename: str):
        data = BytesIO(image_bytes)
        
        self.s3_client.upload_fileobj(
            data, 
            self.bucket_name, 
            filename,
            ExtraArgs={'ContentType': 'image/png'}
        )
        return f"http://{os.getenv('SERVER_NAME')}:9000/{self.bucket_name}/{filename}"

    def delete_image(self, filename: str):
        self.s3_client.delete_object(Bucket=self.bucket_name, Key=filename)

    def get_download_url(self, filename: str):
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': filename},
            ExpiresIn=3600
        )

storage = MinioStorage()