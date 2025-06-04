import json
import boto3
import os
import uuid
from datetime import datetime

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('UPLOADS_BUCKET', 'default-uploads-bucket')

def handler(event, context):
    """
    Lambda function to generate pre-signed URLs for S3 file uploads.
    
    Args:
        event (dict): API Gateway event
        context (object): Lambda context
        
    Returns:
        dict: API Gateway response object
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        file_name = body.get('fileName', '')
        file_type = body.get('fileType', '')
        
        if not file_name or not file_type:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'fileName and fileType are required'})
            }
        
        # Generate a unique key for the file
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        file_extension = file_name.split('.')[-1] if '.' in file_name else ''
        key = f"uploads/{timestamp}_{unique_id}.{file_extension}" if file_extension else f"uploads/{timestamp}_{unique_id}"
        
        # Generate pre-signed URL
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': key,
                'ContentType': file_type
            },
            ExpiresIn=300  # URL expires in 5 minutes
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'key': key
            })
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }