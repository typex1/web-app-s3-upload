import unittest
import json
import os
import sys
from unittest.mock import patch, MagicMock

# Add the Lambda function code to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock the Lambda function environment
os.environ['UPLOADS_BUCKET'] = 'test-uploads-bucket'

class TestLambdaFunction(unittest.TestCase):
    """Test cases for the Lambda function that generates pre-signed URLs."""
    
    @patch('boto3.client')
    def test_handler_success(self, mock_boto3_client):
        """Test successful generation of pre-signed URL."""
        # Import the Lambda function code
        from lambda_function import handler
        
        # Mock the S3 client and its generate_presigned_url method
        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3
        mock_s3.generate_presigned_url.return_value = 'https://test-presigned-url.com'
        
        # Create a test event
        event = {
            'body': json.dumps({
                'fileName': 'test-file.jpg',
                'fileType': 'image/jpeg'
            })
        }
        
        # Call the handler function
        response = handler(event, {})
        
        # Assert the response
        self.assertEqual(response['statusCode'], 200)
        self.assertEqual(response['headers']['Content-Type'], 'application/json')
        self.assertEqual(response['headers']['Access-Control-Allow-Origin'], '*')
        
        # Parse the response body
        body = json.loads(response['body'])
        self.assertEqual(body['uploadUrl'], 'https://test-presigned-url.com')
        self.assertTrue('key' in body)
        self.assertTrue(body['key'].startswith('uploads/'))
        self.assertTrue('.jpg' in body['key'])
        
        # Assert the S3 client was called correctly
        mock_boto3_client.assert_called_once_with('s3')
        mock_s3.generate_presigned_url.assert_called_once()
        args, kwargs = mock_s3.generate_presigned_url.call_args
        self.assertEqual(args[0], 'put_object')
        self.assertEqual(kwargs['Params']['Bucket'], 'test-uploads-bucket')
        self.assertTrue(kwargs['Params']['Key'].startswith('uploads/'))
        self.assertEqual(kwargs['Params']['ContentType'], 'image/jpeg')
        self.assertEqual(kwargs['ExpiresIn'], 300)
    
    @patch('boto3.client')
    def test_handler_missing_parameters(self, mock_boto3_client):
        """Test handling of missing parameters."""
        # Import the Lambda function code
        from lambda_function import handler
        
        # Create a test event with missing parameters
        event = {
            'body': json.dumps({})
        }
        
        # Call the handler function
        response = handler(event, {})
        
        # Assert the response
        self.assertEqual(response['statusCode'], 400)
        self.assertEqual(response['headers']['Content-Type'], 'application/json')
        self.assertEqual(response['headers']['Access-Control-Allow-Origin'], '*')
        
        # Parse the response body
        body = json.loads(response['body'])
        self.assertEqual(body['error'], 'fileName and fileType are required')
        
        # Assert the S3 client was not called
        mock_boto3_client.assert_called_once_with('s3')
        mock_boto3_client.return_value.generate_presigned_url.assert_not_called()
    
    @patch('boto3.client')
    def test_handler_exception(self, mock_boto3_client):
        """Test handling of exceptions."""
        # Import the Lambda function code
        from lambda_function import handler
        
        # Mock the S3 client to raise an exception
        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3
        mock_s3.generate_presigned_url.side_effect = Exception('Test exception')
        
        # Create a test event
        event = {
            'body': json.dumps({
                'fileName': 'test-file.jpg',
                'fileType': 'image/jpeg'
            })
        }
        
        # Call the handler function
        response = handler(event, {})
        
        # Assert the response
        self.assertEqual(response['statusCode'], 500)
        self.assertEqual(response['headers']['Content-Type'], 'application/json')
        self.assertEqual(response['headers']['Access-Control-Allow-Origin'], '*')
        
        # Parse the response body
        body = json.loads(response['body'])
        self.assertEqual(body['error'], 'Test exception')

if __name__ == '__main__':
    unittest.main()