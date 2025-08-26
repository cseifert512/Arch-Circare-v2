import requests
import json

def test_search_with_filters():
    """Test search functionality with the updated climate data"""
    
    print("🧪 Testing Sprint C - Filter Functionality")
    print("=" * 50)
    
    # Test 1: Search without filters
    print("\n1. Testing search without filters...")
    with open('navigator/data/images/p_sanaa_rolex/hero.jpg', 'rb') as f:
        files = {'file': f}
        params = {'top_k': 5}
        response = requests.post('http://127.0.0.1:8000/search/file', 
                               files=files, 
                               params=params)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Base search successful: {len(data.get('results', []))} results")
        print(f"   Filters applied: {data.get('filters', {})}")
        print(f"   Weights used: {data.get('weights', {})}")
    else:
        print(f"❌ Base search failed: {response.status_code}")
        print(f"   Error response: {response.text}")
        return
    
    # Test 2: Search with typology filter (education)
    print("\n2. Testing search with typology=education filter...")
    with open('navigator/data/images/p_sanaa_rolex/hero.jpg', 'rb') as f:
        files = {'file': f}
        params = {
            'top_k': 5,
            'typology': 'education',
            'w_visual': 1.0,
            'w_attr': 0.25
        }
        
        response = requests.post('http://127.0.0.1:8000/search/file', 
                               files=files, 
                               params=params)
    
    print(f"   Response status: {response.status_code}")
    if response.status_code != 200:
        print(f"   Error response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Typology filter successful: {len(data.get('results', []))} results")
        print(f"   Filters applied: {data.get('filters', {})}")
        
        # Check if results contain education typology
        results = data.get('results', [])
        education_count = 0
        for result in results:
            if 'typology' in result and result['typology'] == 'education':
                education_count += 1
        
        print(f"   Education projects in results: {education_count}/{len(results)}")
    else:
        print(f"❌ Typology filter failed: {response.status_code}")
    
    # Test 3: Search with climate filter (mediterranean)
    print("\n3. Testing search with climate=mediterranean filter...")
    with open('navigator/data/images/p_sanaa_rolex/hero.jpg', 'rb') as f:
        files = {'file': f}
        params = {
            'top_k': 5,
            'climate_bin': 'mediterranean',
            'w_visual': 1.0,
            'w_attr': 0.25
        }
        
        response = requests.post('http://127.0.0.1:8000/search/file', 
                               files=files, 
                               params=params)
    
    print(f"   Response status: {response.status_code}")
    if response.status_code != 200:
        print(f"   Error response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Climate filter successful: {len(data.get('results', []))} results")
        print(f"   Filters applied: {data.get('filters', {})}")
        
        # Check if results contain mediterranean climate
        results = data.get('results', [])
        mediterranean_count = 0
        for result in results:
            if 'climate_bin' in result and result['climate_bin'] == 'mediterranean':
                mediterranean_count += 1
        
        print(f"   Mediterranean projects in results: {mediterranean_count}/{len(results)}")
    else:
        print(f"❌ Climate filter failed: {response.status_code}")
    
    # Test 4: Search with strict mode
    print("\n4. Testing search with strict mode (typology=education)...")
    with open('navigator/data/images/p_sanaa_rolex/hero.jpg', 'rb') as f:
        files = {'file': f}
        params = {
            'top_k': 10,
            'typology': 'education',
            'strict': 'true',
            'w_visual': 1.0,
            'w_attr': 0.25
        }
        
        response = requests.post('http://127.0.0.1:8000/search/file', 
                               files=files, 
                               params=params)
    
    print(f"   Response status: {response.status_code}")
    if response.status_code != 200:
        print(f"   Error response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Strict mode successful: {len(data.get('results', []))} results")
        print(f"   Filters applied: {data.get('filters', {})}")
        
        # Check if ALL results are education
        results = data.get('results', [])
        all_education = all('typology' in result and result['typology'] == 'education' for result in results)
        print(f"   All results are education: {'✅' if all_education else '❌'}")
    else:
        print(f"❌ Strict mode failed: {response.status_code}")
    
    # Test 5: Verify all climate bins are populated
    print("\n5. Verifying all projects have non-empty climate_bin...")
    response = requests.get('http://127.0.0.1:8000/projects')
    
    if response.status_code == 200:
        projects = response.json()
        empty_climate_count = 0
        climate_bins = set()
        
        for project in projects:
            climate_bin = project.get('climate_bin', '')
            if climate_bin and climate_bin != 'unknown':
                climate_bins.add(climate_bin)
            else:
                empty_climate_count += 1
        
        print(f"   Projects with empty climate_bin: {empty_climate_count}")
        print(f"   Available climate bins: {sorted(climate_bins)}")
        
        if empty_climate_count == 0:
            print("   ✅ All projects have non-empty climate_bin values")
        else:
            print("   ❌ Some projects still have empty climate_bin values")
    else:
        print(f"❌ Failed to get projects: {response.status_code}")

if __name__ == "__main__":
    test_search_with_filters()
