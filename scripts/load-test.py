"""
Load Testing Script for Security Testing
---------------------------------------
Simulates high request volumes to test rate limiting and DoS protection
"""

import requests
import time
import argparse
import threading
import concurrent.futures
from collections import Counter

# Parse command line arguments
parser = argparse.ArgumentParser(description='Load testing tool for security testing')
parser.add_argument('--target', required=True, help='Target URL')
parser.add_argument('--requests', type=int, default=100, help='Number of requests to send')
parser.add_argument('--concurrency', type=int, default=10, help='Number of concurrent requests')
parser.add_argument('--token', help='JWT token for authenticated requests')
args = parser.parse_args()

# Results tracking
results = Counter()
lock = threading.Lock()

def send_request(i):
    headers = {}
    if args.token:
        headers['Authorization'] = f'Bearer {args.token}'
    
    start_time = time.time()
    try:
        response = requests.get(args.target, headers=headers, timeout=5)
        duration = time.time() - start_time
        
        with lock:
            results[response.status_code] += 1
            results['total_time'] += duration
        
        return f"Request {i}: {response.status_code} in {duration:.2f}s"
    except Exception as e:
        with lock:
            results['error'] += 1
            results['total_time'] += time.time() - start_time
        
        return f"Request {i}: Error - {str(e)}"

def main():
    print(f"Starting load test against {args.target}")
    print(f"Sending {args.requests} requests with concurrency {args.concurrency}")
    
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = [executor.submit(send_request, i) for i in range(args.requests)]
        
        for future in concurrent.futures.as_completed(futures):
            print(future.result())
    
    total_time = time.time() - start_time
    
    print("\nResults Summary:")
    print(f"Total requests: {args.requests}")
    print(f"Total time: {total_time:.2f} seconds")
    print(f"Requests per second: {args.requests / total_time:.2f}")
    
    print("\nStatus Codes:")
    for status, count in sorted(results.items()):
        if isinstance(status, int) or status == 'error':
            print(f"  {status}: {count} ({count / args.requests * 100:.1f}%)")
    
    if 429 in results:
        print(f"\nRate limiting detected: {results[429]} requests were throttled")

if __name__ == "__main__":
    main()